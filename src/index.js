// src/index.js
var SITEURL = 'whydonate.cc';
var WP_HOST = 'wp.whydonate.com';
var langs = /* @__PURE__ */ new Set([
	'/nl',
	'/be',
	'/de',
	'/fr',
	'/es',
	'/en',
	'/ro',
	'/pt',
	'/pl',
	'/it',
	'/hu',
	'/el',
	'/hr',
	'/bg',
	'/fi',
	'/cs',
	'/da',
	'/sk',
	'/sv',
	'/uk',
]);

var pathsToRedirect = /* @__PURE__ */ new Set([
	'/account',
	'/fundraising',
	'/donate',
	'/search',
	'/user',
	'/dashboard',
	'/profile',
	'/my-fundraisers',
	'/custom-branding',
	'/organisation',
	'/custom-domain',
	'/balance',
	'/donations',
]);

const FUND_META = {
	nl: 'Inzamelingsactie',
	be: 'Фандрайзінг',
	de: 'Spendenaktion',
	fr: 'Levée de fonds',
	es: 'Recaudar fondos',
	en: 'Fundraising',
	ro: 'Strângere de fonduri',
	pt: 'Arrecadação de fundos',
	pl: 'Zbiórka środków',
	it: 'Raccolta fondi',
	hu: 'Pénzgyűjtés',
	el: 'Χρηματοδότηση',
	hr: 'Sakupljanje sredstava',
	bg: 'Събиране на средства',
	fi: 'Varainkeruu',
	cs: 'Sbírání finančních prostředků',
	da: 'Indsamling af midler',
	sk: 'Zbieranie finančných prostriedkov',
	sv: 'Insamling',
	uk: 'Збір коштів',
};

const ALT_LOCALES = [
	'nl-nl',
	'en-en',
	'es-es',
	'de-de',
	'fr-fr',
	'nl-be',
	'fr-be',
	'fr-ch',
	'de-ch',
	'en',
	'en-dk',
	'en-ie',
	'en-no',
	'en-se',
	'en-gb',
	'bg-bg',
	'hr-hr',
	'cs-cz',
	'da-dk',
	'fi-fi',
	'el-el',
	'hu-hu',
	'it-it',
	'pl-pl',
	'pt-pt',
	'ro-ro',
	'sk-sk',
	'sv-se',
	'uk-ua',
];

async function handleRequest(request, env) {
	let url = new URL(request.url);

	if (url.hostname === `www.` + SITEURL) {
		url.hostname = SITEURL;
		return Response.redirect(url.toString(), 301);
	}
	//Condition for custom domain
	if (url.hostname !== SITEURL) {
		let pathname = url.pathname;

		// JS and CSS file handling
		if (pathname.includes('.js') || pathname.includes('.css')) {
			return fetchContent(`https://whydonate.cc${pathname}`, request);
		}

		// Home page handling
		if (
			(langs.has(pathname) && pathname.endsWith('')) ||
			(langs.has(pathname.substring(0, 3)) && pathname.length <= 4)
		) {
			const response = await handleHomePage(url, request, langs);
			if (response) return response;
		}

		// Fundraising and donation pages
		const pathParts = pathname.split('/');
		const lang = `/${pathParts[1]}`;
		const path = `/${pathParts[2]}`;

		if (langs.has(lang) && pathsToRedirect.has(path)) {
			const domain = url.hostname;
			const response = await fetchContent(
				`https://whydonate.cc${pathname}`,
				request,
			);

			return new HTMLRewriter()
				.on('meta[property="og:url"]', {
					element(element) {
						element.setAttribute('content', `https://${domain}${pathname}`);
					},
				})
				.transform(response);
		}

		if (pathsToRedirect.has(`/${pathParts[1]}`)) {
			return handleFundraisingPages(url, request, lang, pathsToRedirect);
		}

		// Default handler
		const response = await fetchContent(`https://whydonate.cc/en/`, request);
		return new HTMLRewriter()
			.on('meta[property="og:url"]', {
				element(element) {
					element.setAttribute('content', `https://${url.hostname}${pathname}`);
				},
			})
			.transform(response);
	}

	// WP STARTS
	if (
		!url.pathname.includes('wp') &&
		(url.pathname.includes('.js') || url.pathname.includes('.css'))
	) {
		return await fetch(request);
	}
	if (url.pathname.includes('wp')) {
		return handleBlog(request);
	}
	if (
		url.pathname === '/' ||
		(langs.has(url.pathname) && url.pathname.endsWith('')) ||
		(langs.has(url.pathname.substring(0, 3)) && url.pathname.length <= 4)
	) {
		return await fetch(request);
	}
	if (
		url.searchParams.get('wpml-app') === 'ate-widget' ||
		url.searchParams.has('s')
	) {
		return handleBlog(request);
	}
	const pathParts = url.pathname.split('/');
	const lang = '/' + pathParts[1];
	let path = '/' + pathParts[2];
	if (langs.has(lang) && pathsToRedirect.has(path)) {
		return await fetch(request);
	}
	path = '/' + pathParts[1];
	if (
		pathsToRedirect.has(path) ||
		pathParts[1].includes('sitemap') ||
		pathParts[1] === 'robots.txt'
	) {
		return await fetch(request);
	}
	return handleBlog(request);
}

async function handleBlog(request) {
	let url = new URL(request.url);
	let reqHost = url.hostname;
	url.hostname = WP_HOST;
	let response = await fetch(url.toString(), request);
	response = new Response(response.body, response);
	const location = response.headers.get('location');
	if (location != null) {
		response.headers.set(
			'location',
			location.replace('https://' + SITEURL, 'https://' + reqHost),
		);
		response.headers.set(
			'location',
			location.replace('https://' + WP_HOST, 'https://' + reqHost),
		);
	}
	let cookies = response.headers.getAll('set-cookie');
	response.headers.delete('set-cookie');
	for (const cookie of cookies) {
		response.headers.append(
			'set-cookie',
			cookie.replace('domain=' + WP_HOST, 'domain=' + reqHost),
		);
	}
	const rewriter = new HTMLRewriter()
		.on('a', new AttributeRewriter('ref', WP_HOST, reqHost))
		.on('img', new AttributeRewriter('src', WP_HOST, reqHost))
		.on('link', new AttributeRewriter('href', WP_HOST, reqHost))
		.on('meta', new AttributeRewriter('content', WP_HOST, reqHost))
		.on('script', new AttributeRewriter('src', WP_HOST, reqHost))
		.on('form', new AttributeRewriter('action', WP_HOST, reqHost));
	const contentType = response.headers.get('Content-Type');
	if (contentType?.startsWith('text/html')) {
		return rewriter.transform(response);
	} else {
		return response;
	}
}

var AttributeRewriter = class {
	constructor(attributeName, oldStr, newStr) {
		this.attributeName = attributeName;
		this.oldStr = oldStr;
		this.newStr = newStr;
	}
	element(element) {
		const attribute = element.getAttribute(this.attributeName);
		if (attribute) {
			element.setAttribute(
				this.attributeName,
				attribute.replace(this.oldStr, this.newStr),
			);
		}
	}
};
var src_default = {
	async fetch(request, env, ctx) {
		return handleRequest(request, env);
	},
};

function TransformMetaTags(
	response,
	meta_tags,
	twitter_meta,
	og_meta,
	domain,
	languageCode,
	url
) {
	let AddedMetaTagsRes = new HTMLRewriter()
		// Replace or update the meta tags in the <head> section
		.on('title', {
			element(element) {
				element.setInnerContent(meta_tags.title);
			},
		})
		.on('meta[name="description"]', {
			element(element) {
				element.setAttribute('content', meta_tags.description);
			},
		})
		.on('meta[property="og:title"]', {
			element(element) {
				element.setAttribute('content', og_meta.title);
			},
		})
		.on('meta[property="og:description"]', {
			element(element) {
				element.setAttribute('content', og_meta.description);
			},
		})
		.on('meta[property="og:url"]', {
			element(element) {
				element.setAttribute('content', og_meta.url);
			},
		})
		.on('meta[property="og:type"]', {
			element(element) {
				element.setAttribute('content', og_meta.type);
			},
		})
		.on('meta[property="og:image"]', {
			element(element) {
				element.setAttribute('content', og_meta.image);
			},
		})
		.on('meta[property="twitter:title"]', {
			element(element) {
				element.setAttribute('content', twitter_meta.title);
			},
		})
		.on('meta[property="twitter:description"]', {
			element(element) {
				element.setAttribute('content', twitter_meta.description);
			},
		})
		.on('meta[property="twitter:url"]', {
			element(element) {
				element.setAttribute('content', twitter_meta.url);
			},
		})
		.on('meta[property="twitter:image"]', {
			element(element) {
				element.setAttribute('content', twitter_meta.image);
			},
		})
		.on('meta[property="twitter:card"]', {
			element(element) {
				element.setAttribute('content', twitter_meta.card);
			},
		})
		.transform(response);

	let addedAlternateLinksRes = ALT_LOCALES.forEach((locale) => {
		new HTMLRewriter()
			.on('link[rel="alternate"]', {
				element(element) {
					element.setAttribute('hreflang', locale);
					element.setAttribute(
						'href',
						'https://' + domain + '/' + locale.substring(0, 2),
					);
				},
			})
			.transform(AddedMetaTagsRes);
	});

	let addedCanonicalLinksRes = new HTMLRewriter()
		.on('link[rel="canonical"]', {
			element(element) {
				element.setAttribute('href', url);
			},
		})
		.transform(addedAlternateLinksRes);

	return addedCanonicalLinksRes;
}

/**
 * Fetches the user ID based on the provided domain by making an API call.
 *
 * @param {string} domain - The domain to verify and get the associated user ID.
 * @returns {Promise<string|Error>} The user ID if successful, or an Error if something fails.
 */
async function getUserIdFromDomain(domain) {
	if (!domain || typeof domain !== 'string') {
		// Check if domain is valid
		console.error('Invalid domain provided');
	}

	// Define the API URL dynamically based on the provided domain
	const API_URL = `https://customdomain-master.whydonate.dev/custom_domain/verification?domain=${domain}`;

	try {
		// Perform the API call
		const response = await fetch(API_URL);

		// Check if the response status is OK (200-299 range)
		if (!response.ok) {
			console.error(`HTTP error! Status: ${response.status}`);
		}

		// Parse the JSON response
		const data = await response.json();

		// Check if the expected data is in the response
		if (data && data.data && data.data.id) {
			return data.data.id; // Return the user ID
		} else {
			console.log('User ID not found in the response');
			return 0;
		}
	} catch (error) {
		// Log any errors and rethrow them for further handling (e.g., showing an error message to the user)
		console.error('Error fetching user ID:', error.message);
	}
}

async function getCustomDomainData(user_id, language_code) {
	const API_URL = `https://fundraiser-master.whydonate.dev/custom-domain/data?user_id=${user_id}&language=${language_code}`;

	const response = await fetch(API_URL);

	// Check if the response status is OK (200-299 range)
	if (!response.ok) {
		console.log(`HTTP error! Status: ${response.status}`);
	}

	// Parse the JSON response
	const data = await response.json();
	return data.data;
}

// Helper function to fetch content and handle errors
async function fetchContent(url, request) {
	try {
		return await fetch(url, request);
	} catch (error) {
		console.error(`Error fetching ${url}:`, error);
	}
}

// Helper function to create meta tag data
function createMetaTags(title, description, image, domain, url) {
	const metaTags = {
		title,
		description,
		image,
	};

	const twitterMeta = {
		title,
		description,
		url: domain,
		image,
		card: 'summary_large_image',
	};

	const ogMeta = {
		title,
		description,
		url: domain,
		type: 'website',
		image,
	};

	return { metaTags, twitterMeta, ogMeta };
}

// Helper function to transform meta tags
function transformMetaTags(
	response,
	metaTags,
	twitterMeta,
	ogMeta,
	domain,
	languageCode,
	url
) {
	return TransformMetaTags(
		response,
		metaTags,
		twitterMeta,
		ogMeta,
		domain,
		languageCode,
		url
	);
}

// Handler for fetching and transforming home page metadata
async function handleHomePage(url, request, langs) {
	let domain = url.hostname;
	//domain = 'support.coop-africa.org';
	let languageCode = 'en';
	if (langs.has(url.pathname.substring(0, 3))) {
		languageCode = url.pathname.substring(1, 3);
	}

	const userId = await getUserIdFromDomain(domain);
	const customDomainData = await getCustomDomainData(userId, languageCode);

	const isCustomHome = customDomainData.is_custom_home;
	const isFundraiserHome = customDomainData.is_fundraiser_home;

	let title, description, imageUrl;

	if (isCustomHome) {
		title = `${FUND_META[languageCode]} | ${customDomainData.custom_home_data.customData.name}`;
		description = customDomainData.custom_home_data.customData.description;
		imageUrl = `https://whydonate.com/cdn-cgi/imagedelivery/_0vgnXOEIHPwLg2E52a7gg/${customDomainData.custom_home_data.customData.image}/public`;
	} else if (isFundraiserHome) {
		title = customDomainData.fundraiser_data.fudraiserDetails.title;
		description = customDomainData.fundraiser_data.description.description;
		imageUrl =
			customDomainData.fundraiser_data.fudraiserDetails.background.image;
	} else {
		return null;
	}

	const { metaTags, twitterMeta, ogMeta } = createMetaTags(
		title,
		description,
		imageUrl,
		domain,
		url.pathname,
	);
	return transformMetaTags(
		await fetchContent(`https://whydonate.cc${url.pathname}`, request),
		metaTags,
		twitterMeta,
		ogMeta,
		domain,
		languageCode,
		url
	);
}

// Handler for fundraising pages with specific paths
async function handleFundraisingPages(url, request, lang, pathsToRedirect) {
	const domain = url.hostname;
	const response = await fetchContent(
		`https://whydonate.cc/en${url.pathname}`,
		request,
	);

	return new HTMLRewriter()
		.on('meta[property="og:url"]', {
			element(element) {
				element.setAttribute('content', `https://${domain}${url.pathname}`);
			},
		})
		.transform(response);
}

export { src_default as default };
//# sourceMappingURL=index.js.map
