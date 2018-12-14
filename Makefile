.PHONY : install test github push

install:
	rm -f yarn.lock || true
	yarn install

test:
	yarn test

push:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push

github:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push github master