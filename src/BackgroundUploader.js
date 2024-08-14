import NetworkApi from "./NetworkApi";
import notify from "./utils/notify";
import pjson from '../package.json';

let uploadBackgroundImage = (sensor, f, t, doneCB) => {
    let file = f.target.files[0]
    if (file.type.match(/image.*/)) {
        let reader = new FileReader();
        reader.onload = readerEvent => {
            let image = new Image();
            image.onerror = () => {
                notify.error(t("image_format_not_supported"));
                doneCB(null);
            };
            image.onload = () => {
                let canvas = document.createElement('canvas'),
                    max_size = pjson.settings.uploadImageMaxSize,
                    width = image.width,
                    height = image.height;
                if (height > max_size && width > max_size) {
                    if (height > width) {
                        width *= max_size / height;
                        height = max_size;
                    } else {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                } else if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(image, 0, 0, width, height);
                let dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                let api = new NetworkApi();
                api.prepareUpload(sensor.sensor, 'image/jpeg', ya => {
                    if (ya.result === "success") {
                        let url = ya.data.uploadURL
                        api.uploadImage(url, 'image/jpeg', dataUrl, () => {
                            sensor.picture = dataUrl.split("?")[0]
                            doneCB(sensor.picture)
                        }, err => {
                            console.log("err", err)
                            notify.error(t("something_went_wrong"))
                            doneCB(null)
                        })
                    }
                }, err => {
                    console.log("err", err)
                    notify.error(t("something_went_wrong"))
                    doneCB(null)
                })
            }
            image.src = readerEvent.target.result;
        }
        reader.readAsDataURL(file);
    } else {
        notify.error(t("something_went_wrong"))
        doneCB(null)
    }
}
export default uploadBackgroundImage
