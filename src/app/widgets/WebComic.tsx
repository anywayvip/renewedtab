import React from 'react';
import { Vector2 } from 'app/utils/Vector2';
import Schema, { AutocompleteList, type } from 'app/utils/Schema';
import { useFeed } from 'app/hooks/feeds';
import { WidgetProps } from 'app/Widget';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { schemaMessages } from 'app/locale/common';
import Panel from 'app/components/Panel';
import { getAPI } from 'app/hooks/http';
import ErrorView from 'app/components/ErrorView';


const messages = defineMessages({
	title: {
		defaultMessage: "Web Comic",
		description: "Web Comic Widget",
	},

	description: {
		defaultMessage: "Shows the most recent image from a Atom or RSS, useful for WebComics.",
	},

	titleHint: {
		defaultMessage: "Leave blank to use feed's title",
	},

	loading: {
		defaultMessage: "Loading feed...",
	},

	noImages: {
		defaultMessage: "No images found on feed"
	}
});

interface WebComicProps {
	url: string;
}

export default function WebComic(widget: WidgetProps<WebComicProps>) {
	const props = widget.props;
	const [feed, error] = useFeed(props.url, [props.url]);

	if (!feed) {
		return (<ErrorView error={error} loading={true} />);
	}

	const article = feed.articles[0];
	if (article?.image == undefined) {
		return (<ErrorView error={messages.noImages} />);
	}

	const title = article.title;
	return (
		<Panel {...widget.theme} className="image-caption" invisClassName="image-caption text-shadow-hard">
			<a href={article.link} title={article.alt ?? ""}>
				<img src={article.image} alt={article.alt ?? ""} />
			</a>
			<h2><a href={article.link}>{title}</a></h2>
		</Panel>);
}


WebComic.title = messages.title;
WebComic.description = messages.description;

WebComic.initialProps = {
	url: "https://xkcd.com/atom.xml"
};

WebComic.schema = {
	url: type.urlPerm(schemaMessages.url, schemaMessages.rssUrlHint,
			(intl) => getAPI<AutocompleteList[]>(intl, "webcomics/", {})),
} as Schema;

WebComic.defaultSize = new Vector2(5, 4);
