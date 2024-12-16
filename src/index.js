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
	"/account",
	"/fundraising",
	"/donate",
	"/search",
	"/user",
	"/dashboard",
	"/profile",
	"/my-fundraisers",
	"/custom-branding",
	"/organisation",
	"/custom-domain",
	"/balance",
	"/donations"
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

async function handleRequest(request, env) {
	let url = new URL(request.url);

	if (url.hostname === `www.` + SITEURL) {
		url.hostname = SITEURL;
		return Response.redirect(url.toString(), 301);
	}
	//Condition for custom domain
	if (url.hostname !== SITEURL) {
		
		// Code For JS CSS FILES
		if (url.pathname.includes('.js') || url.pathname.includes('.css')) {
			const response = await fetch(`https://whydonate.cc${url.pathname}`, request);
			return response;
		}

		// FOR HOME PAGE WITH LANG ONLY
		if ((langs.has(url.pathname) && url.pathname.endsWith('')) || (langs.has(url.pathname.substring(0, 3)) && url.pathname.length <= 4)) {
			let response = await fetch(`https://whydonate.cc${url.pathname}`, request);

			try {
				console.log('HOME COND with lang')
				// EXTRACT domain NAME
				let domain;
				domain = url.hostname;

				// FETCH CUSTOM domain META TAGS FROM API
				let user_id;
				let custom_domain_data = {};
				let is_custom_home = false;
				let is_fundraiser_home = false;
				let language_code = 'en';

				user_id = await getUserIdFromDomain(domain);

				// Retreve custom domain data
				if (langs.has(url.pathname.substring(0, 3))) {
					language_code = url.pathname.substring(1, 3);
				}

				custom_domain_data = await getCustomDomainData(user_id, language_code);

				is_custom_home = custom_domain_data.is_custom_home;
				is_fundraiser_home = custom_domain_data.is_fundraiser_home;

				let title, description, image_url, meta_tags, twitter_meta, og_meta;

				if (is_custom_home) {
					title = FUND_META[language_code] + ' | ' + custom_domain_data.custom_home_data.customData.name;
					description = custom_domain_data.custom_home_data.customData.description;
					image_url = `https://whydonate.cc/cdn-cgi/imagedelivery/_0vgnXOEIHPwLg2E52a7gg/${custom_domain_data.custom_home_data.customData.image}/public`;

					meta_tags = {
						title: title,
						description: description,
						image: image_url,
					};

					twitter_meta = {
						title: title,
						description: description,
						url: domain,
						image: image_url,
						card: 'summary_large_image',
					};

					og_meta = {
						title: title,
						description: description,
						url: domain,
						type: 'website',
						image: image_url,
					};

					return TransformMetaTags(response, meta_tags, twitter_meta, og_meta, domain);
				} else if (is_fundraiser_home) {
					title = custom_domain_data.fundraiser_data.fudraiserDetails.title;
					description = custom_domain_data.fundraiser_data.description.description;
					image_url = custom_domain_data.fundraiser_data.fudraiserDetails.background.image;

					meta_tags = {
						title: title,
						description: description,
						image: image_url,
					};

					twitter_meta = {
						title: title,
						description: description,
						url: domain,
						image: image_url,
						card: 'summary_large_image',
					};

					og_meta = {
						title: title,
						description: description,
						url: domain,
						type: 'website',
						image: image_url,
					};
					// TRANSFORM THE OUTPUT HTML
					return TransformMetaTags(response, meta_tags, twitter_meta, og_meta);
				}
			} catch (error) {
				return response;
			}
		}

		// FOR FUNDRAISING AND DONATIONS
		const pathParts2 = url.pathname.split('/');
		const lang2 = '/' + pathParts2[1];
		let path2 = '/' + pathParts2[2];
		if (langs.has(lang2) && pathsToRedirect.has(path2)) {
			console.log("COND 2")

			let response = await fetch(`https://whydonate.cc${url.pathname}`, request);

			try {
				// EXTRACT domain NAME
				let domain;
			    domain = url.hostname;

				return new HTMLRewriter().on('meta[property="og:url"]', {
					element(element) {
						element.setAttribute('content', 'https://'+domain+url.pathname);
					},
				}).transform(response);			

				
			} catch (error) {
				return response;
			}
			
		}

		path2 = '/' + pathParts2[1];

		// FOR FUNDRAISING PAGES
		if (pathsToRedirect.has(path2)) {
			console.log("COND 3")
			let response = await fetch(`https://whydonate.cc/en${url.pathname}`, request);

			try {
				// EXTRACT domain NAME
				let domain;
			    domain = url.hostname;

				return new HTMLRewriter().on('meta[property="og:url"]', {
					element(element) {
						element.setAttribute('content', 'https://'+domain+url.pathname);
					},
				}).transform(response);			

				
			} catch (error) {
				return response;
			}
		}

		console.log("COND DEFAULT")
		const response = await fetch(`https://whydonate.cc/en/`, request);

		try {
			// EXTRACT domain NAME
			let domain;
			domain = url.hostname;

			return new HTMLRewriter().on('meta[property="og:url"]', {
				element(element) {
					element.setAttribute('content', 'https://'+domain+url.pathname);
				},
			}).transform(response);			

			
		} catch (error) {
			return response;
		}
	}
	if (!url.pathname.includes('wp') && (url.pathname.includes('.js') || url.pathname.includes('.css'))) {
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
	if (url.searchParams.get('wpml-app') === 'ate-widget' || url.searchParams.has('s')) {
		return handleBlog(request);
	}
	const pathParts = url.pathname.split('/');
	const lang = '/' + pathParts[1];
	let path = '/' + pathParts[2];
	if (langs.has(lang) && pathsToRedirect.has(path)) {
		return await fetch(request);
	}
	path = '/' + pathParts[1];
	if (pathsToRedirect.has(path) || pathParts[1].includes('sitemap') || pathParts[1] === 'robots.txt') {
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
		response.headers.set('location', location.replace('https://' + SITEURL, 'https://' + reqHost));
		response.headers.set('location', location.replace('https://' + WP_HOST, 'https://' + reqHost));
	}
	let cookies = response.headers.getAll('set-cookie');
	response.headers.delete('set-cookie');
	for (const cookie of cookies) {
		response.headers.append('set-cookie', cookie.replace('domain=' + WP_HOST, 'domain=' + reqHost));
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
			element.setAttribute(this.attributeName, attribute.replace(this.oldStr, this.newStr));
		}
	}
};
var src_default = {
	async fetch(request, env, ctx) {
		return handleRequest(request, env);
	},
};

function TransformMetaTags(response, meta_tags, twitter_meta, og_meta, domain) {
	return (
		new HTMLRewriter()
			// Replace or update the meta tags in the <head> section
			.on('title', {
				element(element) {
					element.setInnerContent(meta_tags.title);
				},
			})
			.on('link[rel="alternate"]', {
				element(element) {
					element.setAttribute('href', 'https://'+domain+'/');
				},
			})
			.on('link[rel="canonical"]', {
				element(element) {
					element.setAttribute('href', 'https://'+domain+'/');
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
			.transform(response)
	);
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
		throw new Error('Invalid domain provided');
	}

	// Define the API URL dynamically based on the provided domain
	const API_URL = `https://customdomain-master.whydonate.dev/custom_domain/verification?domain=${domain}`;

	try {
		// Perform the API call
		const response = await fetch(API_URL);

		// Check if the response status is OK (200-299 range)
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		// Parse the JSON response
		const data = await response.json();

		// Check if the expected data is in the response
		if (data && data.data && data.data.id) {
			return data.data.id; // Return the user ID
		} else {
			throw new Error('User ID not found in the response');
		}
	} catch (error) {
		// Log any errors and rethrow them for further handling (e.g., showing an error message to the user)
		console.error('Error fetching user ID:', error.message);
		throw error; // Rethrow the error so the caller can handle it
	}
}

async function getCustomDomainData(user_id, language_code) {
	const API_URL = `https://fundraiser-master.whydonate.dev/custom-domain/data?user_id=${user_id}&language=${language_code}`;

	const response = await fetch(API_URL);

	// Check if the response status is OK (200-299 range)
	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	}

	// Parse the JSON response
	const data = await response.json();
	return data.data;
}

export { src_default as default };
//# sourceMappingURL=index.js.map
