import { Options } from 'prettier';
import parserBabel from 'prettier/parser-babel';
import parserCss from 'prettier/parser-postcss';
import { sortedUniq } from 'lodash';

import { allComponents } from '../../../../../../fragment-components';
import { addIfNotExist } from '../../../../../../ui-fragment/src/utils';

export const formatOptions: Options = {
	plugins: [parserBabel],
	trailingComma: 'none',
	useTabs: true
};

export const formatOptionsCss: Options = {
	parser: 'css',
	plugins: [parserCss]
};

export const getAdditionalCode = (componentObj: any, fragments: any[]) => {
	if (typeof componentObj === 'string' || !componentObj) {
		return componentObj;
	}
	let collectedCode = {};

	for (const component of Object.values(allComponents)) {
		if (componentObj.type === component.componentInfo.type && !component.componentInfo.codeExport.react.isNotDirectExport) {
			if (component.componentInfo.codeExport.react.additionalCode) {
				collectedCode = { ...collectedCode, ...component.componentInfo.codeExport.react.additionalCode(componentObj) };
			}
		}
	}

	if (componentObj.items) {
		componentObj.items.forEach((item: any) => {
			collectedCode = { ...collectedCode, ...getAdditionalCode(item, fragments) };
		});
	}

	return collectedCode;
};

export const getAdditionalCodeAsString = (componentObj: any, fragments: any[]) => {
	const collectedCode = getAdditionalCode(componentObj, fragments);
	return Object.values(collectedCode).join('\n');
};

export const jsonToCarbonImports = (json: any) => {
	const imports: any[] = [];

	for (const component of Object.values(allComponents)) {
		if (json.type === component.componentInfo.type) {
			const componentImport = Array.isArray(component.componentInfo.codeExport.react.imports) ?
				component.componentInfo.codeExport.react.imports : component.componentInfo.codeExport.react.imports({ json });

			addIfNotExist(imports, componentImport);
		}
	}

	if (json.items) {
		json.items.forEach((item: any) => {
			addIfNotExist(imports, jsonToCarbonImports(item));
		});
	}

	return imports;
};

export const jsonToTemplate = (json: any, fragments: any[]) => {
	if (typeof json === 'string' || !json) {
		return json;
	}

	for (const component of Object.values(allComponents)) {
		if (json.type === component.componentInfo.type && !component.componentInfo.codeExport.react.isNotDirectExport) {
			return component.componentInfo.codeExport.react.code({ json, jsonToTemplate, fragments });
		}
	}

	if (json.items) {
		return json.items.map((item: any) => jsonToTemplate(item, fragments)).join('\n');
	}
};

export const otherImportsFromComponentObj = (json: any, fragments?: any[]) => {
	let imports = '';
	for (const component of Object.values(allComponents)) {
		if (json.type === component.componentInfo.type) {
			if (component.componentInfo.codeExport.react.otherImports) {
				imports += component.componentInfo.codeExport.react.otherImports({ json, fragments });
				break;
			}
		}
	}

	if (json.items) {
		imports += json.items.map((item: any) => otherImportsFromComponentObj(item, fragments)).join('\n');
	}

	// remove duplicate imports
	imports = sortedUniq(imports.split('\n')).join('\n');

	return imports;
};
