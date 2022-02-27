import React, { useEffect, useMemo, useState } from 'react';
import { Vector2 } from 'app/utils/Vector2';
import Schema, { AutocompleteItem, type } from 'app/utils/Schema';
import { WidgetProps, WidgetType } from 'app/Widget';
import { defineMessages, FormattedMessage } from 'react-intl';
import { miscMessages, schemaMessages } from 'app/locale/common';
import Panel from 'app/components/Panel';
import { getAPI, useMultiFeed, useForceUpdateValue } from 'app/hooks';
import ErrorView from 'app/components/ErrorView';
import uuid from 'app/utils/uuid';
import { TabOption, Tabs } from 'app/components/Tabs';
import UserError from 'app/utils/UserError';
import { useGlobalSearch } from 'app/hooks/globalSearch';
import { parseURL, queryMatchesAny } from 'app/utils';
import { Article, FeedSource } from 'app/utils/Feed';
import WebsiteIcon from 'app/components/WebsiteIcon';


const messages = defineMessages({
	title: {
		defaultMessage: "Feed",
		description: "Feed Widget",
	},

	description: {
		defaultMessage: "Shows an Atom or RSS feed, useful for following the news, websites, and blogs",
		description: "Feed widget description",
	},

	titleHint: {
		defaultMessage: "Leave blank to use feed's title",
		description: "Feed widget: form field hint (Title)",
	},

	sources: {
		defaultMessage: "Sources",
		description: "Feed widget: form field label",
	},

	combineSources: {
		defaultMessage: "Combine sources into single tab",
		description: "Feed widget: form field label",
	},

	filters: {
		defaultMessage: "Filter Articles",
		description: "Feed widget: form field label",
	},

	filtersHint: {
		defaultMessage: "An article will be shown if it matches at least one 'Show' filter (if any), and no 'Hide' filters.",
		description: "Feed widget: form field hint (Filters)",
	},

	isAllowed: {
		defaultMessage: "Show / Hide",
		description: "Feed widget filter allow label",
	},

	show: {
		defaultMessage: "Show",
		description: "Feed widget: filter allow checkbox label",
	},

	hide: {
		defaultMessage: "Hide",
		description: "Feed widget: filter show checkbox label",
	},

	noSources: {
		defaultMessage: "Please specify a source",
		description: "Feed widget: no sources error message",
	},
});


interface Filter {
	id: string; //< required for React
	isAllowed: (boolean | string);
	text: string;
}

interface FeedProps {
	sources: FeedSource[];
	combineSources: boolean;
	filters: Filter[];
	openInNewTab: boolean;
	useWebsiteIcons: boolean;
}


interface FeedPanelProps extends FeedProps {
	onGotTitle: (source: FeedSource, title: string) => void;
}


function FeedArticle({ article, feedProps: props }: { article: Article, feedProps: FeedProps }) {
	if (props.sources.length == 1) {
		return (<>{article.title}</>);
	} else if (props.useWebsiteIcons) {
		return (
			<div className="row">
				<span className="col-auto mr-1">
					<WebsiteIcon url={article.feed.source!.url} />
				</span>
				<span className="col">{article.title}</span>
			</div>);
	} else {
		return (
			<>
				{article.title}
				<p className="mt-1 mb-0 text-muted">
					{article.feed.source?.title || article.feed.title}
				</p>
			</>);
	}
}


function FeedPanel(props: FeedPanelProps) {
	const [feed, error] = useMultiFeed(props.sources, [props.sources.length]);
	const { query } = useGlobalSearch();
	const target = props.openInNewTab ? "_blank" : undefined;

	if (!feed) {
		useEffect(() => {}, [""]);
		return (
			<div className="panel-inset">
				<ErrorView error={error} loading={true} panel={false} />
			</div>);
	}

	useEffect(() => {
		const seen: any = {};

		(feed?.articles ?? []).map(x => x.feed).forEach(subfeed => {
			if (subfeed.title && subfeed.source && !subfeed.source.title && !seen[subfeed.source.id]) {
				seen[subfeed.source.id] = true;
				props.onGotTitle(subfeed.source, subfeed.title);
			}
		});
	}, [feed]);

	const allowFilters = props.filters
		.filter(filter => filter.isAllowed === true || filter.isAllowed == "true")
		.map(filter => filter.text.toLowerCase());

	const blockFilters = props.filters
		.filter(filter => !(filter.isAllowed === true || filter.isAllowed == "true"))
		.map(filter => filter.text.toLowerCase());

	const rows = feed.articles
		.filter(article => queryMatchesAny(query, article.title))
		.filter(article => {
			const title = article.title.toLowerCase();
			return article.link &&
					(allowFilters.length == 0 ||
						allowFilters.some(filter => title.includes(filter))) &&
					!blockFilters.some(filter => title.includes(filter));
		})
		.map(article => (
			<li key={article.link}>
				<a href={article.link} target={target} rel="noreferrer">
					<FeedArticle article={article} feedProps={props} />
				</a>
			</li>));

	return (
		<ul className="links">
			{rows}
			{rows.length == 0 && feed.articles.length > 0 && (
					<li className="section">
						<FormattedMessage {...miscMessages.noResults} />
					</li>
				)}
		</ul>);
}


function Feed(widget: WidgetProps<FeedProps>) {
	const props = widget.props;
	const showAll = widget.props.combineSources;
	const showTabs = !showAll;

	const [selectedId, setSelectedId] = useState(showAll ? "*" : (props.sources[0]?.id ?? ""));
	const selectedSource = props.sources.find(x => x.id == selectedId);
	const sources: FeedSource[] = selectedId == "*" ? props.sources : (selectedSource ? [selectedSource] : []);
	const [force, forceUpdate] = useForceUpdateValue();

	const options = useMemo<TabOption[]>(() => {
		const ret: TabOption[] = props.sources.filter(x => x.url).map(x => ({
			id: x.id,
			title: x.title || parseURL(x.url)?.hostname || "?",
			url: x.url,
		}));
		if (showAll) {
			ret.unshift({
				id: "*",
				title: "All",
				url: "",
			});
		}

		return ret;
	}, [force, props.sources, props.sources.length]);

	if (props.sources.length == 0) {
		return (
			<ErrorView error={new UserError(messages.noSources)} />);
	}

	return (
		<Panel {...widget.theme} flush={true}>
			{showTabs && (
				<Tabs value={selectedId} options={options} onChanged={setSelectedId}
					useWebsiteIcons={props.useWebsiteIcons}
					useRootPathForIcons={true} />)}
			<FeedPanel {...props}
				key={sources.map(x => x.url).join(",")}
				sources={sources}
				onGotTitle={(source, title) => {
					source.title = title;
					widget.save();
					forceUpdate();
				}} />
		</Panel>);
}


const filterSchema: Schema<Filter> = {
	isAllowed: type.select({ false: "Hide", true: "Allow" },
		{ false: messages.hide, true: messages.show }, messages.isAllowed),
	text: type.string(schemaMessages.text),
};


const sourceSchema: Schema<FeedSource> = {
	title: type.string(schemaMessages.title, messages.titleHint),
	url: type.urlFeed(schemaMessages.url, schemaMessages.rssUrlHint,
		() => getAPI<AutocompleteItem[]>("feeds/", {})),
};


const widget: WidgetType<FeedProps> = {
	Component: Feed,
	title: messages.title,
	description: messages.description,
	editHint: miscMessages.globalSearchEditHint,
	defaultSize: new Vector2(5, 4),
	initialProps: {
		sources: [
			{
				id: uuid(),
				title: "BBC News",
				url: "https://feeds.bbci.co.uk/news/rss.xml",
			},
			{
				id: uuid(),
				title: "The Register",
				url: "https://www.theregister.com/headlines.atom",
			},
		],
		combineSources: false,
		filters: [],
		openInNewTab: false,
		useWebsiteIcons: false,
	},

	async schema() {
		if (typeof browser !== "undefined") {
			return {
				sources: type.array(sourceSchema, messages.sources),
				filters: type.unorderedArray(filterSchema, messages.filters, messages.filtersHint),
				combineSources: type.boolean(messages.combineSources),
				openInNewTab: type.boolean(schemaMessages.openInNewTab),
				useWebsiteIcons: type.booleanHostPerm(schemaMessages.useWebsiteIcons),
			};
		} else {
			return {
				sources: type.array(sourceSchema, messages.sources),
				filters: type.unorderedArray(filterSchema, messages.filters, messages.filtersHint),
				combineSources: type.boolean(messages.combineSources),
				openInNewTab: type.boolean(schemaMessages.openInNewTab),
			};
		}
	},

	async onLoaded(widget) {
		widget.props.filters = widget.props.filters ?? [];
		if ((widget.props as any).url) {
			widget.props.sources = [
				{
					id: uuid(),
					title: (widget.props as any).title ?? "",
					url: (widget.props as any).url,
				}
			];
			delete (widget.props as any).title;
			delete (widget.props as any).url;
		}
	},
};
export default widget;
