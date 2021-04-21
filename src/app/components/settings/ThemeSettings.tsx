import Schema, { type } from "app/utils/Schema";
import React, { useMemo } from "react";
import { defineMessages, FormattedMessage } from "react-intl";
import { Form } from "../forms";
import { ColorPair } from "../forms/ColorFields";


const messages = defineMessages({
	experimental: {
		defaultMessage: "The following settings are experimental; this means that you may encounter bugs and weirdness when changing them, and updates may break your themes.",
	},

	requiresReload: {
		defaultMessage: "You may need to reload the page to see changes take affect.",
	},

	font: {
		defaultMessage: "Font",
	},

	fontHint: {
		defaultMessage: "Any font name installed on your computer",
	},

	fontScaling: {
		defaultMessage: "Font Scaling",
	},

	panelBlurRadius: {
		defaultMessage: "Panel Blur Radius",
	},

	panelOpacity: {
		defaultMessage: "Panel Background Darkness",
	},

	colorPrimary: {
		defaultMessage: "Primary Color",
	},

	colorPrimaryHint: {
		defaultMessage: "Used for primary buttons and links",
	},
});


export interface ThemeConfig {
	fontFamily?: string;
	fontScaling?: number;
	panelBlurRadius?: number;
	panelOpacity?: number;
	colorPrimary?: ColorPair;
}

const defaults: ThemeConfig = {
	fontFamily: "Roboto",
	fontScaling: 100,
	panelBlurRadius: 12,
	panelOpacity: 50,
	colorPrimary: { one: "#007DB8", two: "#06aed5" },
};


export interface ThemeSettingsProps {
	theme: ThemeConfig | null;
	setTheme: (conf: ThemeConfig) => void;
}

export function ThemeSettings(props: ThemeSettingsProps) {
	const theme = useMemo<ThemeConfig>(
		() => Object.assign({}, defaults, props.theme),
		[ props.theme ]);

	function handleOnChange(key: string, value: any) {
		(props.theme as any)[key] = value;
		props.setTheme(props.theme!);
	}

	return (
		<div className="modal-body">
			<h2>
				<FormattedMessage defaultMessage="Theme" />
			</h2>
			<p className="text-muted">
				<FormattedMessage {...messages.experimental} />
			</p>
			<p className="text-muted">
				<FormattedMessage {...messages.requiresReload} />
			</p>
			<Form values={theme} schema={getThemeSchema()}
						onChange={handleOnChange} />
		</div>);
}


function getThemeSchema(): Schema {
	const supportsBackdropFilter =
		CSS.supports("backdrop-filter: brightness(70%) contrast(110%) saturate(140%) blur(12px)");

	if (supportsBackdropFilter) {
		return {
			fontFamily: type.string(messages.font, messages.fontHint),
			fontScaling: type.unit_number(messages.fontScaling, "%"),
			panelBlurRadius: type.unit_number(messages.panelBlurRadius, "px"),
			panelOpacity: type.unit_number(messages.panelOpacity, "%"),
			colorPrimary: type.colorPair(messages.colorPrimary, messages.colorPrimaryHint),
		};
	} else {
		return {
			fontFamily: type.string(messages.font, messages.fontHint),
			fontScaling: type.unit_number(messages.fontScaling, "%"),
			colorPrimary: type.colorPair(messages.colorPrimary, messages.colorPrimaryHint),
		};
	}
}


export function applyTheme(theme: ThemeConfig) {
	theme = Object.assign({}, defaults, theme);

	const fontScaling = Math.max(Math.min(theme.fontScaling!, 200), 80);

	const style = document.documentElement.style;
	style.setProperty("--font-family", theme.fontFamily!);
	style.setProperty("--font-size", `${fontScaling}%`);
	style.setProperty("--panel-blur", `${theme.panelBlurRadius}px`);
	style.setProperty("--panel-opacity", `${theme.panelOpacity}%`);
	style.setProperty("--color-primary", theme.colorPrimary!.one);
	style.setProperty("--color-primary-highlight", theme.colorPrimary!.two);
}
