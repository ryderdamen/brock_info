
.PHONY: install
install:
	npm install

.PHONY: deploy
deploy:
	gcloud functions deploy brockAssistantFulfillment --source ./src --trigger-http --project brocku-bot
