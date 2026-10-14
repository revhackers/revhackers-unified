/**
 * ghlRelay.ts
 *
 * Frontend utility for sending events to GoHighLevel via GHL v2 API.
 * Maps all form fields & UTMs to exact customField IDs in the Revhackers subaccount.
 */

const REVHACKERS_FIELD_MAP: Record<string, string> = {
    utm_source: '1qsr7n8OT9GcDfs1aq6J',
    utm_medium: '4j9NUCQoBZyhe0WdufzH',
    utm_campaign: '0FU30gR9HD7UxPZcOns9',
    utm_term: 'LCLQDAx8N7XwB1eSk1kb',
    utm_content: 'W7HVgpIpwlm6uYFvHKwA',
    cargo: 'OSTYIR0k40rFmwZ0EP0h',
    setor: 'JhYjktc505SiN12iB8kG',
    principal_dor: 'fwqjWlKHp0P1f6biwu8e',
    desafios_da_empresa: 'gRxNUvGtxiGcXf04KO8R',
    ferramentas_atuais: '1YtAMjATP2H8gqbQTniB',
    crm_atual: 'XdMA3ZfqWiNVPGr7s2mC',
    tamanho_do_time: 'sXUgGYTSmoPonpNl4z4h',
    materiallink: 'WMq9rJL3kzLjcSILnEdx',
    diagnostic_score: 'qCUpCmj7ciDfQnonMFqY',
    diagnostic_category: 'h3jGZ0m5IajLV9nynKcI',
    diagnostic_type: 'wuQsE7Xw0NndleUuLM67',
    linkedin: 'YjGoZEjX20GpLJzlOCWV',
    fonte_do_lead: 'yALdhsRVfsjk1e4n7L0a',
};

export type GHLEventType =
    | 'rei_completed'
    | 'contact_form'
    | 'newsletter'
    | 'roi_calculator'
    | 'score_captured'
    | 'lead_capture'
    | 'download'
    | 'email_material';

function parseName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName || '').trim().split(/\s+/);
    return {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
    };
}

function getUtmParams(): Record<string, string> {
    try {
        const params = new URLSearchParams(window.location.search);
        const utms: Record<string, string> = {};
        const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
        for (const key of keys) {
            const val = params.get(key);
            if (val) utms[key] = val;
        }
        return utms;
    } catch {
        return {};
    }
}

export function buildContactPayload(
    eventType: GHLEventType | string,
    payload: Record<string, unknown>,
): Record<string, unknown> {
    const { firstName, lastName } = parseName(
        (payload.fullName as string) || (payload.name as string) || (payload.firstName as string) || ''
    );

    const utms = getUtmParams();

    const tags = ['revhackers', eventType];
    if (Array.isArray(payload.tags)) {
        for (const tag of payload.tags as unknown[]) {
            if (typeof tag === 'string' && tag.trim() && !tags.includes(tag)) {
                tags.push(tag);
            }
        }
    }
    if (eventType === 'download' || eventType === 'email_material' || payload.materialId || payload.materiallink || payload.materialTitle) {
        if (!tags.includes('materiais')) {
            tags.push('materiais');
        }
        if (payload.materialId || payload.slug) {
            tags.push(`download:${payload.materialId || payload.slug}`);
        }
    }

    const base: Record<string, unknown> = {
        firstName: firstName || (payload.firstName as string) || '',
        lastName: lastName || (payload.lastName as string) || '',
        email: payload.email || payload.corporateEmail || '',
        phone: payload.phone || payload.whatsapp || '',
        companyName: payload.company || payload.companyName || '',
        website: payload.website || '',
        source: utms.utm_source
            ? `${utms.utm_source}${utms.utm_medium ? ' / ' + utms.utm_medium : ''}`
            : `RevHackers - ${eventType}`,
        tags,
    };

    const customFields: Array<{ id: string; value: string }> = [];

    const addCustomField = (key: string, value: unknown) => {
        if (!value) return;
        const fieldId = REVHACKERS_FIELD_MAP[key];
        if (fieldId) {
            customFields.push({ id: fieldId, value: String(value) });
        }
    };

    // Auto-populate UTMs
    if (utms.utm_source) addCustomField('utm_source', utms.utm_source);
    if (utms.utm_medium) addCustomField('utm_medium', utms.utm_medium);
    if (utms.utm_campaign) addCustomField('utm_campaign', utms.utm_campaign);
    if (utms.utm_term) addCustomField('utm_term', utms.utm_term);
    if (utms.utm_content) addCustomField('utm_content', utms.utm_content);

    // Form fields
    if (payload.role) addCustomField('cargo', payload.role);
    if (payload.segment || payload.industry) addCustomField('setor', payload.segment || payload.industry);
    if (payload.message || payload.whyParticipate) addCustomField('principal_dor', payload.message || payload.whyParticipate);
    if (payload.whatToBuild) addCustomField('desafios_da_empresa', payload.whatToBuild);
    if (payload.crm) addCustomField('crm_atual', payload.crm);
    if (payload.companySize) addCustomField('tamanho_do_time', payload.companySize);
    if (payload.materialTitle || payload.material) addCustomField('materiallink', payload.materialTitle || payload.material);
    if (payload.score || payload.total_score) addCustomField('diagnostic_score', String(payload.score || payload.total_score));
    if (payload.maturity_level) addCustomField('diagnostic_category', payload.maturity_level);

    if (customFields.length > 0) {
        base.customFields = customFields;
    }

    // Material & Email Delivery metadata for ghl.php backend API
    base.actionType = payload.actionType || eventType;
    base.formType = payload.formType || eventType;
    base.materialTitle = payload.materialTitle || payload.material_title || payload.material || '';
    base.materialLink = payload.materialLink || payload.material_link || payload.linkMaterial || '';
    base.slug = payload.slug || payload.materialId || '';

    return base;
}

export async function sendToGHL(
    eventType: GHLEventType | string,
    payload: Record<string, unknown>,
    _organizationId?: string,
): Promise<boolean> {
    try {
        const contactPayload = buildContactPayload(eventType, payload);

        // O destino do relay vem SOMENTE de VITE_GHL_RELAY_URL (ex.: `/api/ghl.php`
        // na Hostinger). Ausente ou vazio => no-op fail-closed: nenhum POST é feito,
        // nenhum fallback para produção. `false` = "não entregue", como nas falhas.
        const relayUrl = (import.meta.env.VITE_GHL_RELAY_URL ?? '').trim();
        if (!relayUrl) {
            console.warn('[ghlRelay] VITE_GHL_RELAY_URL ausente — envio ao GHL ignorado (fail-closed).');
            return false;
        }
        const proxyEndpoint = relayUrl;

        const response = await fetch(proxyEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactPayload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`[ghlRelay] GHL Proxy error (${response.status}):`, errorData);
            return false;
        }

        return true;
    } catch (err: any) {
        console.warn('[ghlRelay] Failed to reach GHL Proxy (non-critical):', err?.message ?? err);
        return false;
    }
}
