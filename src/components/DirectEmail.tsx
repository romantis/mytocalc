import { createMemo, createSignal } from "solid-js";

export default function DirectEmail() {
    // Email obfuscation
    const [email, setEmail] = createSignal('mailto:соntасt@mytoсalс.соm');
    const obfuscatedEmail = createMemo(() => ['mailto:',
      String.fromCharCode(...
        import.meta.env.PUBLIC_MY_CONTACT_EMAIL
          .split('@')[0]
          .split('')
          .map((c:string) => c.charCodeAt(0))
          ),
      String.fromCharCode(64), 
      'mytocalc.com'
    ].join(''));
    
    const revealEmail = () => {
    // Only reveal if user interaction (likely a human)
      setEmail(obfuscatedEmail());
    };
    return (

      <a
        onClick={revealEmail}
        onMouseOver={revealEmail}
        href={email()}
        class="hover:text-gray-300"
      >
        Other questions
      </a>
    );
}