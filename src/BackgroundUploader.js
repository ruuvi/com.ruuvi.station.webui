import NetworkApi from "./NetworkApi";
import notify from "./utils/notify";
import logger from "./utils/logger";
import pjson from '../package.json';

let uploadBackgroundImage = (sensor, f, t, previewCB, doneCB) => {
    let file = f.target.files[0]
    if (!file) {
        doneCB(null)
        return
    }
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
                previewCB(dataUrl.split("?")[0])
                let api = new NetworkApi();
                api.prepareUpload(sensor.sensor, 'image/jpeg', ya => {
                    if (ya.result === "success") {
                        let url = ya.data.uploadURL
                        api.uploadImage(url, 'image/jpeg', dataUrl, () => {
                            // The image is stored by this point, so failing to resolve its
                            // final URL is not an upload failure: keep showing the local
                            // preview and let the next sensor refresh pick up the real URL.
                            const keepLocalPreview = () => {
                                sensor.picture = dataUrl
                                doneCB(dataUrl)
                            }
                            api.user(userResponse => {
                                const updatedSensor = userResponse.data?.sensors?.find(
                                    current => current.sensor === sensor.sensor,
                                )
                                const pictureUrl = updatedSensor?.picture
                                if (!pictureUrl) {
                                    logger.error("uploaded image URL missing from user response", userResponse)
                                    keepLocalPreview()
                                    return
                                }

                                sensor.picture = pictureUrl

                                // Keep the reload-time sensor snapshot in sync with the
                                // URL returned by the backend after the upload.
                                try {
                                    const cachedSensors = JSON.parse(localStorage.getItem("sensors") || "[]")
                                    const cachedSensor = cachedSensors.find(cached => cached.sensor === sensor.sensor)
                                    if (cachedSensor) {
                                        cachedSensor.picture = pictureUrl
                                        localStorage.setItem("sensors", JSON.stringify(cachedSensors))
                                    }
                                } catch (err) {
                                    logger.error("failed to update cached sensor image", err)
                                }

                                // Load the uploaded image into the browser cache before handing
                                // the URL over, so the card swaps straight from the preview to
                                // the real image instead of flashing an empty background.
                                let handled = false
                                const finish = () => {
                                    if (handled) return
                                    handled = true
                                    clearTimeout(cacheTimeout)
                                    doneCB(pictureUrl)
                                }
                                // Guard against a request that neither loads nor errors, which
                                // would otherwise leave the caller's spinner running forever.
                                const cacheTimeout = setTimeout(finish, pjson.settings.uploadImageCacheTimeoutMs)
                                const cachedImage = new Image()
                                cachedImage.onload = finish
                                cachedImage.onerror = finish
                                cachedImage.src = pictureUrl
                            }, err => {
                                logger.error("failed to refresh sensor image URL", err)
                                keepLocalPreview()
                            })
                        }, err => {
                            logger.error("upload image failed", err)
                            notify.error(t("something_went_wrong"))
                            doneCB(null)
                        })
                    } else {
                        logger.error("prepare upload returned an error", ya)
                        notify.error(t("something_went_wrong"))
                        doneCB(null)
                    }
                }, err => {
                    logger.error("prepare upload failed", err)
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
