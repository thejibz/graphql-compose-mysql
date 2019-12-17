.PHONY : playground install test github push kazan

install:
	rm -f yarn.lock || true
	yarn install

test:
	yarn test

playground:
	yarn playground

gitlab:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push origin master

github:
	$(MAKE) test
	git add .
	git status
	git commit -m"[sync]"|| true 
	git push github master

publish:
	$(MAKE) gitlab
	$(MAKE) github
	npm publish