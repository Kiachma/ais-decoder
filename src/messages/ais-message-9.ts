import AisBitField from '../ais-bitfield';
import format from '../format';
import AisMessage from './ais-message';

class AisMessage9 extends AisMessage {
  altitude: number;
  rateOfTurn: number;
  speedOverGround: number;
  accuracy: boolean;
  lon: number;
  lat: number;
  courseOverGround: number;
  heading: number;
  utcSecond: number;
  specialManoeuvre: number;
  raim: boolean;
  radio: number;

  constructor(messageType: number, channel: string, bitField: AisBitField) {
    super(messageType, channel, bitField);
    this.altitude = bitField.getInt(38, 12);
    this.speedOverGround = bitField.getInt(50, 10);
    this.accuracy = bitField.getBoolean(60, 1);
    this.lon = format.longitude(bitField.getSignedInt(61, 28));
    this.lat = format.latitude(bitField.getSignedInt(89, 27));
    this.courseOverGround = format.courseOverGround(bitField.getInt(116, 12));
    this.utcSecond = bitField.getInt(128, 6);
    this.raim = bitField.getBoolean(147, 1);
    this.radio = bitField.getInt(148, 19);
  }
}

export default AisMessage9;
