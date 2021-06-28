import df3 from './3';
import df5 from './5';

function decoder(data) {
    try {
        var companyIndex = data.indexOf("FF9904");
        if (companyIndex === -1) return null;
        var rData = data.substring(companyIndex+2, data.length);
        var inBytes = hexToBytes(rData);
        switch (rData.substring(4,6)) {
            case "03":
                return df3.parse(rData)
            case "05":
                return df5.parse(inBytes)
            default:
                return null;
        }
    } catch (error) {
        console.log("parse error", error)
        return null;
    }
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

export default decoder