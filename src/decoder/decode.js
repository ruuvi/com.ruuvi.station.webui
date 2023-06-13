import df3 from './3';
import df5 from './5';
import df6 from './6';
import df2and4 from './2and4';

const ruu_vi = "ruu.vi/#"
function decoder(data) {
    try {
        var companyIndex = data.indexOf("FF9904");
        if (companyIndex === -1) {
            let asStr = String.fromCharCode(...hexToBytes(data))
            let ruuViIndex = asStr.indexOf(ruu_vi)
            if (ruuViIndex !== -1) {
                let pl = asStr.substring(ruuViIndex + ruu_vi.length, asStr.length)
                let buf = base64ToHex(pl)
                if (buf) {
                    let bytes = hexToBytes(buf)
                    if (bytes[0] === 2 || bytes[0] === 4) {
                        return df2and4.parse(bytes)
                    }
                }
            }
            return null;
        }
        var rData = data.substring(companyIndex + 2, data.length);
        var inBytes = hexToBytes(rData);
        switch (rData.substring(4, 6)) {
            case "03":
                return df3.parse(rData)
            case "05":
                return df5.parse(inBytes)
            case "06":
                return df6.parse(inBytes)
            default:
                return null;
        }
    } catch (error) {
        console.log("parse error", error)
        return null;
    }
}

function base64ToHex(base64) {
    let raw = '';
    let result = '';
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < base64.length; i++) {
        const char = base64.charAt(i);
        const index = base64Chars.indexOf(char);
        if (index === -1) {
            return ''
        }
        const bits = index.toString(2).padStart(6, '0');
        raw += bits;
    }
    for (let i = 0; i < raw.length; i += 4) {
        const chunk = raw.substr(i, 4);
        const hex = parseInt(chunk, 2).toString(16);
        result += hex;
    }
    return result;
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

export default decoder