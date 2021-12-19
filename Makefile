all: localization clean_build build

localization:
	git submodule update --remote station.localization
	cd station.localization/localize.converter.i18n; node convert.js
	cp station.localization/localize.converter.i18n/localization_i18n.json src/localization_i18n.json

clean_build:
	rm -rf build

build:
	PUBLIC_URL="./" npm run build
	mv build staging
	npm run build
	mv staging build/
