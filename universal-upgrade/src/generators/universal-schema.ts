/**
 * Universal Schema.org Builder
 * 
 * Generates rich structured data adapted to each page mode and intent.
 * Replaces the basic buildSchemaOrg() in page-generator.ts.
 * 
 * Schemas generated:
 * - Local: LocalBusiness + Service + GeoCoordinates + BreadcrumbList + FAQPage
 * - Thematic: Article/Course/HowTo + BreadcrumbList + FAQPage
 * - Product: Product/Vehicle + AggregateOffer + BreadcrumbList + FAQPage
 */

import { UniversalPage } from '../../config/site-modes.js';

interface SchemaResult {
  schemas: Record<string, unknown>[];
}

// ─── Breadcrumb (all pages) ──────────────────────────────────

function buildBreadcrumb(page: UniversalPage): Record<string, unknown> {
  const items: Array<{ name: string; url: string }> = [];
  let domain = page.site.domain || '';
  // Ensure domain has protocol
  if (domain && !domain.startsWith('http')) {
    domain = `https://${domain}`;
  }
  domain = domain.replace(/\/$/, ''); // Remove trailing slash

  // Level 1: Home
  items.push({ name: 'Accueil', url: domain });

  // Level 2: depends on mode
  if (page.city && page.service) {
    // Local city_service: Home > Ville > Service
    items.push({ name: page.city.name, url: `${domain}/${page.city.slug}` });
    items.push({ name: page.service.name, url: `${domain}/${page.slug}` });
  } else if (page.city) {
    // Local city hub: Home > Ville
    items.push({ name: page.city.name, url: `${domain}/${page.slug}` });
  } else if (page.topic) {
    // Thematic: Home > Topic
    if (page.topic.parentTopic) {
      items.push({ name: page.topic.parentTopic, url: `${domain}/${page.topic.parentTopic}` });
    }
    items.push({ name: page.topic.name, url: `${domain}/${page.slug}` });
  } else if (page.product) {
    // Product: Home > Category > Product
    if (page.modeConfig.product?.productType) {
      const catSlug = page.modeConfig.product.productType
        .toLowerCase().replace(/[^a-z0-9]+/g, '-');
      items.push({ name: page.modeConfig.product.productType, url: `${domain}/${catSlug}` });
    }
    items.push({ name: page.product.name, url: `${domain}/${page.slug}` });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── FAQ Schema ──────────────────────────────────────────────

function buildFaqSchema(content: Record<string, unknown>): Record<string, unknown> | null {
  const faq = content.faq as Array<{ question: string; answer: string }>;
  if (!faq || faq.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

// ─── Local Business Schema ───────────────────────────────────

function buildLocalBusinessSchema(page: UniversalPage, content: Record<string, unknown>): Record<string, unknown> {
  const site = page.site;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': site.schemaType || 'LocalBusiness',
    name: site.name,
    telephone: site.phone,
    url: site.domain,
    image: site.logo || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address,
      addressLocality: site.city,
      postalCode: site.postalCode,
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.latitude || undefined,
      longitude: site.longitude || undefined,
    },
    areaServed: [],
    priceRange: site.priceRange || '€€',
  };

  // Area served
  const areas: Array<Record<string, unknown>> = [
    { '@type': 'City', name: site.city },
  ];
  if (page.city && page.city.name !== site.city) {
    areas.push({ '@type': 'City', name: page.city.name });
  }
  schema.areaServed = areas;

  // Service schema if service page
  if (page.service) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: page.service.name,
      itemListElement: [{
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: page.service.name,
          description: (content.metaDescription as string) || '',
          provider: {
            '@type': site.schemaType || 'LocalBusiness',
            name: site.name,
          },
          areaServed: page.city ? { '@type': 'City', name: page.city.name } : undefined,
        },
      }],
    };
  }

  // Opening hours
  if (site.openingHours) {
    schema.openingHoursSpecification = site.openingHours;
  }

  // Aggregate rating (if available in site config)
  if (site.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: site.aggregateRating.value,
      reviewCount: site.aggregateRating.count,
      bestRating: 5,
    };
  }

  // Clean undefined values
  return JSON.parse(JSON.stringify(schema));
}

// ─── Article / Course / HowTo Schema ─────────────────────────

function buildThematicSchema(page: UniversalPage, content: Record<string, unknown>): Record<string, unknown> {
  const site = page.site;
  const topic = page.topic!;
  const thematic = page.modeConfig.thematic!;

  // Choose schema type based on intent
  let schemaType: string;
  switch (page.intent) {
    case 'formation':
      schemaType = 'Course';
      break;
    case 'guide':
      schemaType = 'HowTo';
      break;
    default:
      schemaType = 'Article';
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: (content.h1 as string) || topic.name,
    description: (content.metaDescription as string) || '',
    url: `${site.domain}/${page.slug}`,
    datePublished: new Date().toISOString().split('T')[0],
    dateModified: (content.updatedDate as string) || new Date().toISOString().split('T')[0],
    author: {
      '@type': 'Organization',
      name: site.name,
      url: site.domain,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: site.domain,
      logo: site.logo ? {
        '@type': 'ImageObject',
        url: site.logo,
      } : undefined,
    },
  };

  // Course-specific fields
  if (schemaType === 'Course') {
    schema.provider = {
      '@type': 'Organization',
      name: site.name,
    };
    if (thematic.authority.certifications?.length) {
      schema.educationalCredentialAwarded = thematic.authority.certifications[0];
    }
    schema.audience = {
      '@type': 'Audience',
      audienceType: thematic.targetAudience,
    };
    // Program modules
    const program = content.program as Array<{ module: string; description: string; duration: string }>;
    if (program?.length) {
      schema.hasCourseInstance = {
        '@type': 'CourseInstance',
        courseMode: (content.format as string) || 'mixed',
      };
      schema.syllabusSections = program.map(m => ({
        '@type': 'Syllabus',
        name: m.module,
        description: m.description,
        timeRequired: m.duration,
      }));
    }
  }

  // HowTo-specific fields
  if (schemaType === 'HowTo') {
    const sections = content.seoSections as Array<{ title: string; content: string }>;
    if (sections?.length) {
      schema.step = sections.map((s, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: s.title,
        text: s.content.slice(0, 300),
      }));
    }
  }

  return JSON.parse(JSON.stringify(schema));
}

// ─── Product / Vehicle Schema ────────────────────────────────

function buildProductSchema(page: UniversalPage, content: Record<string, unknown>): Record<string, unknown> {
  const site = page.site;
  const product = page.product!;
  const prodConfig = page.modeConfig.product!;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': prodConfig.schemaType || 'Product',
    name: product.name,
    description: (content.metaDescription as string) || '',
    url: `${site.domain}/${page.slug}`,
    brand: product.attributes.marque ? {
      '@type': 'Brand',
      name: product.attributes.marque,
    } : undefined,
  };

  // Vehicle-specific
  if (prodConfig.schemaType === 'Vehicle') {
    schema.vehicleConfiguration = product.attributes.version || undefined;
    schema.modelDate = product.attributes.annee || undefined;
    schema.mileageFromOdometer = product.attributes.km ? {
      '@type': 'QuantitativeValue',
      value: parseInt(product.attributes.km),
      unitCode: 'KMT',
    } : undefined;
    schema.fuelType = product.attributes.carburant || undefined;
  }

  // Specifications
  const specs = content.specifications as Array<{ label: string; value: string }>;
  if (specs?.length) {
    schema.additionalProperty = specs.map(s => ({
      '@type': 'PropertyValue',
      name: s.label,
      value: s.value,
    }));
  }

  // Seller
  schema.offers = {
    '@type': 'Offer',
    seller: {
      '@type': 'Organization',
      name: site.name,
      telephone: site.phone,
    },
    availability: 'https://schema.org/InStock',
    priceCurrency: 'EUR',
  };

  return JSON.parse(JSON.stringify(schema));
}

// ─── Main Entry Point ────────────────────────────────────────

/**
 * Build complete schema.org JSON-LD for any page.
 * Returns an array of schemas to embed as separate <script> tags.
 */
export function buildUniversalSchemaOrg(
  page: UniversalPage,
  content: Record<string, unknown>
): SchemaResult {
  const schemas: Record<string, unknown>[] = [];

  // 1. Breadcrumb (always)
  schemas.push(buildBreadcrumb(page));

  // 2. Main schema (depends on mode)
  switch (page.modeConfig.mode) {
    case 'local':
      schemas.push(buildLocalBusinessSchema(page, content));
      break;
    case 'thematic':
      schemas.push(buildThematicSchema(page, content));
      break;
    case 'product':
      schemas.push(buildProductSchema(page, content));
      break;
  }

  // 3. FAQ schema (if FAQ present in content)
  const faqSchema = buildFaqSchema(content);
  if (faqSchema) {
    schemas.push(faqSchema);
  }

  return { schemas };
}
