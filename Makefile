all:
	rm -rf build
	PUBLIC_URL="./" npm run build
	mv build staging
	npm run build
	mv staging build/