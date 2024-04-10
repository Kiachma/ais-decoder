import {Transform, TransformOptions} from 'stream';

import AisBitField from './ais-bitfield';
import AisSentence from './ais-sentence';
import {DecodingError} from './errors';
import AisMessage from './messages/ais-message';
import AisMessage123 from './messages/ais-message-123';
import AisMessage18 from './messages/ais-message-18';
import AisMessage24 from './messages/ais-message-24';
import AisMessage4 from './messages/ais-message-4';
import AisMessage5 from './messages/ais-message-5';
import AisMessage8 from './messages/ais-message-8';
import AisMessage9 from './messages/ais-message-9';

interface AisDecoderOptions {
  silent?: boolean;
}

const defaultOptions: AisDecoderOptions = {
  silent: false
};

class AisDecoder extends Transform {
  options: AisDecoderOptions;
  multiPartBuffer: Array<AisSentence> = [];

  constructor(
    options?: AisDecoderOptions,
    transformOptions?: TransformOptions
  ) {
    super(transformOptions);
    this.options = {...defaultOptions, ...options};
    this.setEncoding('utf8');
  }

  _transform(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error) => void
  ): void {
    try {
      const message = chunk.toString(this.readableEncoding);
      const sentence = new AisSentence(message);

      if (sentence.isMultiPart()) {
        this.handleMultiPartSentence(sentence);
      } else {
        this.decodePayload(sentence.payload, sentence.channel, [sentence]);
      }

      return callback();
    } catch (err) {
      if (err instanceof DecodingError && this.options.silent) {
        return callback();
      }

      return callback(err);
    }
  }

  handleMultiPartSentence(sentence: AisSentence): void {
    const prev = this.multiPartBuffer[this.multiPartBuffer.length - 1];
    if (
      (prev && prev.partNumber + 1 !== sentence.partNumber) ||
      (!prev && sentence.partNumber > 1)
    ) {
      console.log(`Wrong order of part numbers prev ${sentence.message}`);
      return;
    }
    this.multiPartBuffer.push(sentence);

    if (sentence.isLastPart()) {
      if (this.multiPartBuffer.length !== sentence.numParts) {
        this.multiPartBuffer.length = 0;
        throw new DecodingError(
          'Incorrect multipart order',
          `${prev}, ${sentence.message}`
        );
      }

      const payloads = this.multiPartBuffer.map(
        multiPartSentence => multiPartSentence.payload
      );
      this.decodePayload(
        payloads.join(''),
        sentence.channel,
        this.multiPartBuffer
      );

      this.multiPartBuffer.length = 0;
    }
  }

  // eslint-disable-next-line complexity
  decodePayload(
    payload: string,
    channel: string,
    sentences: Array<AisSentence>
  ): void {
    const bitField = new AisBitField(payload);
    const messageType = bitField.getInt(0, 6);

    let decodedMessage: AisMessage = null;

    switch (messageType) {
      case 1:
      case 2:
      case 3:
        decodedMessage = new AisMessage123(messageType, channel, bitField);
        break;
      case 4:
        decodedMessage = new AisMessage4(messageType, channel, bitField);
        break;
      case 5:
        decodedMessage = new AisMessage5(messageType, channel, bitField);
        break;
      case 8:
        decodedMessage = new AisMessage8(messageType, channel, bitField);
        break;
      case 9:
        decodedMessage = new AisMessage9(messageType, channel, bitField);
        break;
      case 18:
        decodedMessage = new AisMessage18(messageType, channel, bitField);
        break;
      case 24:
        decodedMessage = new AisMessage24(messageType, channel, bitField);
        break;
    }

    if (decodedMessage) {
      decodedMessage.sentences = sentences.map(sentence => sentence.message);
      this.push(JSON.stringify(decodedMessage));
    }
  }
}

export default AisDecoder;
