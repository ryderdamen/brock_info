
.PHONY: install
install:
	cd functions && npm install

.PHONY: deploy
deploy:
	firebase deploy
