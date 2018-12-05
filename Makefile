.PHONY : install test github

install:
	rm -f yarn.lock || true
	yarn install

test:
	yarn test

github:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push github master