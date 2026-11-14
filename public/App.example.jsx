// Example ONLY, not a standalone build project.
// Place ../assets and ../dist in React's public/cp-ai-signature/ folder.
import { SignatureLogo, SignatureBadge, SignatureFooter } from './SignatureComponents.jsx';
const application = {
  baseUrl: '/cp-ai-signature/assets', theme: 'dark', locale: 'th',
  product: 'Example React Dashboard (Demo)', appId: 'DEMO-REACT-001',
  version: '1.1.0', projectOwner: 'Example Business Unit'
};
export default function App() {
  return (
    <div>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:16}}>
        <SignatureLogo {...application}/>
        <SignatureBadge {...application}/>
      </header>
      <main><h1>React integration demo</h1><p>Click Built by AI Team to view credits.</p></main>
      <footer><SignatureFooter {...application}/></footer>
    </div>
  );
}
