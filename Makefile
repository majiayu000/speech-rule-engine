#
# Makefile for Speech Rule Engine
# Copyright 2014-2016, Volker Sorge <Volker.Sorge@gmail.com>
#

MODULE_NAME = node_modules
ifneq ($(wildcard ./$(MODULE_NAME)/.*),)
PREFIX = $(abspath .)
else
PREFIX =$(HOME)
endif

# Nodejs location.
NODEJS = node
NODE_MODULES = $(PREFIX)/$(MODULE_NAME)

# Ideally, no changes necessary beyond this point!
SRC_DIR = $(abspath ./src)
BIN_DIR = $(abspath ./bin)
LIB_DIR = $(abspath ./lib)
RES_DIR = $(abspath ./res)
SRC = $(SRC_DIR)/**/*.js
TARGET = $(LIB_DIR)/sre.js
DEPS = $(SRC_DIR)/deps.js
BROWSER = $(LIB_DIR)/sre_browser.js
MATHJAX = $(LIB_DIR)/mathjax-sre.js
SEMANTIC = $(LIB_DIR)/semantic.js
SEMANTIC_NODE = $(LIB_DIR)/semantic-node.js
ENRICH = $(LIB_DIR)/enrich.js
LICENSE = $(RES_DIR)/license-header.txt

INTERACTIVE = $(LIB_DIR)/sre4node.js
JSON_SRC = $(SRC_DIR)/mathmaps
JSON_DST = $(LIB_DIR)/mathmaps
MAPS = functions symbols units
IEMAPS_FILE = $(JSON_DST)/mathmaps_ie.js
LOCALES = $(JSON_SRC)/*  ## $(foreach dir, $(MAPS), $(JSON_SRC)/$(dir))

TEST_DIR = $(abspath ./tests)
TEST_TARGET = $(LIB_DIR)/test.js
TEST_DEPS = $(TEST_DIR)/deps.js
TEST = $(BIN_DIR)/test_sre
TEST_SRC = $(TEST_DIR)/**/*.js $(TEST_DIR)/*.js

JSDOC = $(NODE_MODULES)/.bin/jsdoc
JSDOC_FLAGS = -c $(PREFIX)/.jsdoc.json
DOCS = $(PREFIX)/docs
DOCS_SRC = $(DOCS)/src
DOCS_TESTS = $(DOCS)/tests

JSON_MINIFY = npx json-minify

##################################################################
# Error flags.
# Compiling as rigidly as possible.
# (Currently we use automatically all)
##################################################################
CLOSURE_ERRORS = accessControls\
	checkDebuggerStatement\
	checkRegExp\
	checkTypes\
	checkVars\
	closureDepMethodUsageChecks\
	conformanceViolations\
	constantProperty\
	const\
	deprecatedAnnotations\
	deprecated\
	duplicateMessage\
	duplicate\
	es5Strict\
	externsValidation\
	globalThis\
	invalidCasts\
	misplacedSuppress\
	misplacedTypeAnnotation\
	missingGetCssName\
	missingProperties\
	missingProvide\
	missingRequire\
	missingReturn\
	nonStandardJsDocs\
	strictModuleDepCheck\
	suspiciousCode\
	tweakValidation\
	typeInvalidation\
	undefinedNames\
	undefinedVars\
	unknownDefines\
	unusedLocalVariables\
	unusedPrivateMembers\
	untranspilableFeatures\
	uselessCode\
	violatedModuleDep\
	visibility\
#	reportUnknownTypes\
#       extraRequire\
#       strictCheckTypes\
#       strictMissingProperties\
#       strictPrimitiveOperators

# Deleted Warnings:
# ambiguousFunctionDe
# useOfGoogBase
#
# Old and removed:
# msgDescriptions underscore
#
# New Warnings:
# checkDebuggerStatement closureDepMethodUsageChecks conformanceViolations
# ---- not yet inserted Start ----
# extraRequire
# strictCheckTypes
# strictMissingProperties
# strictPrimitiveOperators
# ---- not yet inserted End ----
# tweakValidation violatedModuleDep
#
MAKE_ERROR_FLAG = --jscomp_error=$(error)
ERROR_FLAGS = $(foreach error, $(CLOSURE_ERRORS), $(MAKE_ERROR_FLAG))

##################################################################
# Extern files.
# (Currently not used as they seem to be included automatically now.)
##################################################################
EXTERN_FILES = $(shell find $(SRC_DIR) -type f -name 'externs.js')
MAKE_EXTERN_FLAG = --externs=$(extern)
EXTERN_FLAGS = $(foreach extern, $(EXTERN_FILES), $(MAKE_EXTERN_FLAG))

COMPILER_FLAGS = $(EXTERN_FLAGS) $(ERROR_FLAGS)


## Node JS modules
# Closure compiler in nodejs.
# Linter in nodejs. 
CLOSURE_LIB_NAME = google-closure-library
CLOSURE_LIB = $(NODE_MODULES)/$(CLOSURE_LIB_NAME)
CLOSURE_ROOT = $(CLOSURE_LIB)/closure/bin/build
COMPILER_JAR = $(NODE_MODULES)/google-closure-compiler/cli.js
CLOSURE_COMPILER = $(COMPILER_JAR) --dependency_mode=PRUNE $(CLOSURE_LIB)/closure/goog/base.js $(ERROR_FLAGS) $(EXTERN_FLAGS) '!**externs.js' --output_wrapper_file $(LICENSE)
DEPSWRITER = python $(CLOSURE_ROOT)/depswriter.py

space = $(null) #
comma = ,
LINT_EXCLUDE_FILES = deps.js,$(IEMAPS_FILE)
LINT_EXCLUDE_DIRS = $(JSON_SRC)

LINT_ROOT = $(NODE_MODULES)/closure-linter-wrapper/tools/
GJSLINT = python $(LINT_ROOT)/gjslint.py --unix_mode --strict --jsdoc -x '$(LINT_EXCLUDE_FILES)' -e '$(LINT_EXCLUDE_DIRS)' -r
FIXJSSTYLE = python $(LINT_ROOT)/fixjsstyle.py --strict --jsdoc -x '$(LINT_EXCLUDE_FILES)' -e '$(LINT_EXCLUDE_DIRS)' -r

#######################################################################3

all: directories deps compile start_files

directories: $(BIN_DIR)

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

lint:
	$(GJSLINT) $(SRC_DIR)
	$(GJSLINT) $(TEST_DIR)


fixjsstyle:
	$(FIXJSSTYLE) $(SRC_DIR)
	$(FIXJSSTYLE) $(TEST_DIR)


compile: $(TARGET)

$(TARGET): $(SRC)
	@echo Compiling Speech Rule Engine
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.Cli --js_output_file=$(TARGET) $^

deps: $(DEPS)

$(DEPS):
	@echo Building Javascript dependencies $(DEPS)
	@$(DEPSWRITER) --root_with_prefix="$(SRC_DIR) $(SRC_DIR)" > $(DEPS)


start_files: directories $(INTERACTIVE)

interactive: directories $(INTERACTIVE) deps

$(INTERACTIVE): 
	@echo "Making interactive script."
	@echo "// This file is automatically generated. Do not edit!\n" > $@
	@echo "require('google-closure-library');" >> $@ 
	@echo "// Rewrite google closure script for our purposes." >> $@
	@echo "global.CLOSURE_IMPORT_SCRIPT = function(src, opt_sourceText) {" >> $@
	@echo "  if (opt_sourceText === undefined) {" >> $@
	@echo "    require((src[0] === '/' ? '' : './../') + src);" >> $@
	@echo "  } else {" >> $@
	@echo "    eval(opt_sourceText);" >> $@
	@echo "  }" >> $@
	@echo "  return true;" >> $@
	@echo "};" >> $@
	@echo "process.env.SRE_JSON_PATH = '$(JSON_SRC)';" >> $@
	@echo "require('$(DEPS)');" >> $@ 
	@echo "goog.require('sre.System');" >> $@
	@echo "sre.System.setAsync()" >> $@

clean: clean_test clean_semantic clean_browser clean_enrich clean_mathjax clean_iemaps
	rm -f $(TARGET)
	rm -f $(DEPS)
	rm -f $(INTERACTIVE)
	rm -rf $(JSON_DST)


##################################################################
# Test environment.
##################################################################
# Extern files.
##################################################################
TEST_EXTERN_FILES = $(shell find $(TEST_DIR) -type f -name 'externs.js')
TEST_FLAGS = $(foreach extern, $(TEST_EXTERN_FILES), $(MAKE_EXTERN_FLAG))

test_deps: $(TEST_DEPS)

$(TEST_DEPS):
	@echo Building Javascript dependencies in test directory $(TEST_DEPS)
	@$(DEPSWRITER) --root_with_prefix="$(TEST_DIR) $(TEST_DIR)" > $(TEST_DEPS)

test: directories test_deps deps test_compile test_script run_test

test_compile: $(TEST_TARGET)

$(TEST_TARGET): $(TEST_SRC) $(SRC)
	@echo Compiling test version of Speech Rule Engine
	@$(CLOSURE_COMPILER) $(TEST_FLAGS) --entry_point=goog:sre.Tests --js_output_file=$(TEST_TARGET) $^

test_script: $(TEST)

$(TEST): 
	@echo "Making test script."
	@echo "#!/bin/bash" > $@
	@echo "## This script is automatically generated. Do not edit!" >> $@
	@echo "\nexport SRE_JSON_PATH=$(JSON_SRC)\n" >> $@
	@echo $(NODEJS) $(TEST_TARGET) "\$$@" >> $@
	@chmod 755 $@

run_test:
	@$(TEST)

clean_test:
	rm -f $(TEST_TARGET)
	rm -f $(TEST_DEPS)
	rm -f $(TEST)


##################################################################
# Publish the API via npm.
##################################################################

publish: clean compile browser maps iemaps

maps: $(MAPS)

$(MAPS): 
	@for j in $(LOCALES); do\
		dir=$(JSON_DST)/`basename $$j`/$@; \
		mkdir -p $$dir; \
		for i in $$j/$@/*.js; do\
			$(JSON_MINIFY) $$i > $$dir/`basename $$i`; \
		done; \
	done

iemaps:
	@echo 'sre.BrowserUtil.mapsForIE = {' > $(IEMAPS_FILE)
	@for j in $(LOCALES); do\
		for dir in $(MAPS); do\
			for i in $(JSON_DST)/`basename $$j`/$$dir/*.js; do\
				echo '"'`basename $$j`'/'`basename $$i`'": '  >> $(IEMAPS_FILE); \
				cat $$i >> $(IEMAPS_FILE); \
				echo ','  >> $(IEMAPS_FILE); \
			done; \
		done; \
	done
	@head -n -1 $(IEMAPS_FILE) > $(IEMAPS_FILE).tmp
	@echo '}\n' >> $(IEMAPS_FILE).tmp
	@mv $(IEMAPS_FILE).tmp $(IEMAPS_FILE)

api: $(SRC)
	@echo Compiling Speech Rule Engine API
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.Api --js_output_file=$(TARGET) $^


##################################################################
# Other useful targets.
##################################################################

browser: $(SRC)
	@echo Compiling browser ready Speech Rule Engine
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.Browser --js_output_file=$(BROWSER) $^

clean_browser:
	rm -f $(BROWSER)

mathjax: $(SRC)
	@echo Compiling MathJax ready Speech Rule Engine
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.Mathjax --js_output_file=$(MATHJAX) $^

clean_mathjax:
	rm -f $(MATHJAX)

semantic: $(SRC)
	@echo Compiling browser ready Semantic Tree API
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.Semantic --js_output_file=$(SEMANTIC) $^

clean_semantic:
	rm -f $(SEMANTIC)

semantic_node: $(SRC)
	@echo Compiling Semantic Tree API for Node
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.SemanticApi --js_output_file=$(SEMANTIC_NODE) $^

clean_semantic_node:
	rm -f $(SEMANTIC_NODE)

enrich: $(SRC)
	@echo Compiling browser ready MathML Enrichment API
	@$(CLOSURE_COMPILER) --entry_point=goog:sre.Enrich --js_output_file=$(ENRICH) $^

clean_enrich:
	rm -f $(ENRICH)

emacs: publish
	@cp $(TARGET) ../emacs-math-speak/

docs: $(JSDOC)
	@$(JSDOC) $(JSDOC_FLAGS) $(SRC) -r -d $(DOCS_SRC)
	@$(JSDOC) $(JSDOC_FLAGS) $(TEST_DIR) -r -d $(DOCS_TESTS)

clean_docs:
	rm -rf $(DOCS)

clean_iemaps:
	rm -f $(IEMAPS_FILE)
