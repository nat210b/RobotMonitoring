/**
 * React wrappers for the ONE shared browser component (no duplicated brand logic).
 * Include /cp-ai-signature/dist/ai-team-signature.css and .js in index.html FIRST.
 * Copy the kit's /assets folder to public/cp-ai-signature/assets.
 * React 18/19 compatible. No backend required.
 */
import { useEffect, useRef } from 'react';

function useSignature(type, config) {
  const element = useRef(null);
  const {
    baseUrl = '/cp-ai-signature/assets', theme = 'dark', locale = 'en',
    product = '', version = '', appId = '', department = 'CP-Innovation',
    developedBy = 'AI Team', maintainedBy = 'AI Team', projectOwner = '',
    contact = '', releaseDate = ''
  } = config || {};
  useEffect(() => {
    const api = window.CPInnovationSignature;
    if (!api) {
      console.error('CPInnovationSignature is not loaded. Include dist/ai-team-signature.js first.');
      return undefined;
    }
    const options = { baseUrl, theme, locale, product, version, appId,
      department, developedBy, maintainedBy, projectOwner, contact, releaseDate };
    const key = type === 'logo' ? 'mountLogo' : type === 'footer' ? 'mountFooter' : 'mountBadge';
    return api[key](element.current, options);
  }, [type,baseUrl,theme,locale,product,version,appId,department,developedBy,maintainedBy,projectOwner,contact,releaseDate]);
  return element;
}
export function SignatureLogo(props) {
  const ref = useSignature('logo', props);
  return <span className="cpait-slot" ref={ref} />;
}
export function SignatureBadge(props) {
  const ref = useSignature('badge', props);
  return <span className="cpait-slot" ref={ref} />;
}
export function SignatureFooter(props) {
  const ref = useSignature('footer', props);
  return <span className="cpait-slot" ref={ref} />;
}
