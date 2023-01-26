import { useContext } from 'react';
import { GlobalStateContext } from '../../../../../../context';
import { getAllFragmentStyleClasses } from '../../../../../../ui-fragment/src/utils';
import { classNameFromFragment, hasFragmentStyleClasses, tagNameFromFragment } from '../../../../../../utils/fragment-tools';
import { format } from '../utils';
import {
	formatOptionsCss,
	formatOptionsHtml,
	formatOptionsTypescript,
	getAllSubfragments,
	getAngularInputsFromJson,
	getAngularOutputsFromJson,
	jsonToAngularImports,
	jsonToTemplate
} from './utils';

const getComponentCode = (fragment: any, fragments: any[]) => {
	const componentCode: any = {};
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { styleClasses: globalStyleClasses } = useContext(GlobalStateContext);
	const subFragments = getAllSubfragments(fragment.data, fragments);

	// component.ts
	componentCode[`src/app/components/${tagNameFromFragment(fragment)}/${tagNameFromFragment(fragment)}.component.ts`] = format(
		`import { Component, Input, Output, EventEmitter } from '@angular/core';
		@Component({
			selector: 'app-${tagNameFromFragment(fragment)}',
			templateUrl: './${tagNameFromFragment(fragment)}.component.html'${hasFragmentStyleClasses(fragment) ? `,
			styleUrls: ['./${tagNameFromFragment(fragment)}.component.scss']` : ''}
		})
		export class ${classNameFromFragment(fragment)} {
			${getAngularInputsFromJson(fragment.data)}
			${getAngularOutputsFromJson(fragment.data)}
		}
	`, formatOptionsTypescript);

	// component.html
	componentCode[`src/app/components/${tagNameFromFragment(fragment)}/${tagNameFromFragment(fragment)}.component.html`] =
		format(jsonToTemplate(fragment.data, fragments), formatOptionsHtml);

	// module.ts
	componentCode[`src/app/components/${tagNameFromFragment(fragment)}/${tagNameFromFragment(fragment)}.module.ts`] = format(
		`import { NgModule } from "@angular/core";
		import { ${jsonToAngularImports(fragment.data).join(', ')} } from 'carbon-components-angular';
		import { ${classNameFromFragment(fragment)} } from "./${tagNameFromFragment(fragment)}.component";
		${
			Object.values(subFragments).map((f) =>
				`import { ${classNameFromFragment(f)}Module} from "../${tagNameFromFragment(f)}/${tagNameFromFragment(f)}.module";`).join('\n')
		}

		@NgModule({
			imports: [${[
				...jsonToAngularImports(fragment.data),
				...Object.values(subFragments).map((fragment) => `${classNameFromFragment(fragment)}Module`)
			].join(', ')}],
			declarations: [${classNameFromFragment(fragment)}],
			exports: [${classNameFromFragment(fragment)}]
		})
		export class ${classNameFromFragment(fragment)}Module {}
	`, formatOptionsTypescript);

	// component.scss
	componentCode[`src/app/components/${tagNameFromFragment(fragment)}/${tagNameFromFragment(fragment)}.component.scss`] = format(
		`${getAllFragmentStyleClasses(fragment, [], globalStyleClasses).map((styleClass: any) => {
			if (!styleClass.content || !styleClass.content.trim()) {
				return null;
			}

			return `.${styleClass.id} {
				${styleClass.content}
			}`;
		}).join('\n')}`,
		formatOptionsCss
	);
	return componentCode;
};

const getAllComponentsCode = (json: any, fragments: any[]) => {
	let allComponents: any = {};

	if (json.data) {
		allComponents = {
			...allComponents,
			...getComponentCode(json, fragments),
			...getAllComponentsCode(json.data, fragments)
		};
	}

	if (json.type === 'fragment') {
		const fragment = fragments.find(f => f.id === json.fragmentId);

		allComponents = {
			...allComponents,
			...getComponentCode(fragment, fragments),
			...getAllComponentsCode(fragment.data, fragments)
		};
	}

	json.items?.forEach((item: any) => {
		allComponents = {
			...allComponents,
			...getAllComponentsCode(item, fragments)
		};
	});

	return allComponents;
};

export const createAngularApp = (fragment: any, fragments: any[]) => {
	const tagName = tagNameFromFragment(fragment);
	const className = classNameFromFragment(fragment);

	const allComponents = getAllComponentsCode(fragment, fragments);

	const appComponentHtml =
		`<app-${tagName}></app-${tagName}>
		`;

	const appComponentTs =
		`import { Component } from '@angular/core';
		@Component({
			selector: 'app-root',
			templateUrl: './app.component.html'
		})
		export class AppComponent {
		}
		`;

	const appModule =
		`import { NgModule } from '@angular/core';
		import { BrowserModule } from '@angular/platform-browser';
		import { AppComponent } from './app.component';
		import { ${className}Module } from './components/${tagName}/${tagName}.module';

		@NgModule({
			imports: [BrowserModule, ${className}Module],
			declarations: [AppComponent],
			bootstrap: [AppComponent]
		})
		export class AppModule {}
		`;

	const indexHtml =
		`<!DOCTYPE html>
		<html lang='en'>
			<head>
				<meta charset='utf-8' />
				<title>Angular</title>
			</head>
			<body>
				<app-root></app-root>
			</body>
		</html>
		`;

	const mainTs =
		`import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
		import { AppModule } from './app/app.module';

		import "carbon-components/css/carbon-components.min.css";

		platformBrowserDynamic()
			.bootstrapModule(AppModule)
			.catch(err => console.log(err));
		`;

	const angularCliJson =
		`{
	"apps": [
		{
			"root": "src",
			"outDir": "dist",
			"assets": ["assets", "favicon.ico"],
			"index": "index.html",
			"main": "main.ts",
			"polyfills": "polyfills.ts",
			"prefix": "app",
			"styles": ["styles.scss"],
			"scripts": [],
			"environmentSource": "environments/environment.ts",
			"environments": {
				"dev": "environments/environment.ts",
				"prod": "environments/environment.prod.ts"
			}
		}
	]
}
`;

	const packageJson = {
		dependencies: {
			'@angular/animations': '12.2.0',
			'@angular/common': '12.2.0',
			'@angular/compiler': '12.2.0',
			'@angular/core': '12.2.0',
			'@angular/forms': '12.2.0',
			'@angular/platform-browser': '12.2.0',
			'@angular/platform-browser-dynamic': '12.2.0',
			'@angular/router': '12.2.0',
			'rxjs': '6.6.0',
			'tslib': '2.3.0',
			'sass': '1.45.0',
			'zone.js': '0.11.4',
			'carbon-components-angular': '4.63.0',
			'carbon-components': '10.58.0'
		}
	};

	return {
		'src/index.html': format(indexHtml, formatOptionsHtml),
		'src/main.ts': format(mainTs, formatOptionsTypescript),
		'src/polyfills.ts': format("import 'zone.js/dist/zone';", formatOptionsTypescript),
		'src/styles.scss': format('', formatOptionsCss),
		'src/app/app.component.html': format(appComponentHtml, formatOptionsHtml),
		'src/app/app.component.ts': format(appComponentTs, formatOptionsTypescript),
		'src/app/app.module.ts': format(appModule, formatOptionsTypescript),
		...allComponents,
		'.angular-cli.json': angularCliJson,
		'package.json': packageJson
	};
};
