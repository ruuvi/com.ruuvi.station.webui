dev: localization_init localization_dev localization_build clean_build build
prod: localization_init localization_prod localization_build clean_build build

localization_init:
	git submodule update --init --remote station.localization

localization_prod:
	cd station.localization; git checkout master; git pull

localization_dev:
	cd station.localization; git checkout dev; git pull

localization_build:
	cd station.localization/localize.converter.i18n; node convert.js
	cp station.localization/localize.converter.i18n/localization_i18n.json src/localization_i18n.json

clean_build:
	rm -rf build

build:
	PUBLIC_URL="./" CI=false npm run build
	mv build staging
	CI=false npm run build
	mv staging build/
