import QRCode from 'qrcode';

export const qrBuffer = (text) => QRCode.toBuffer(text, { width: 320, margin: 1 });