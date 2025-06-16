import { children, createMemo, createSignal, Show } from "solid-js";
import type { JSX } from "solid-js";

interface Props {
    children?: any;
    class?: string;
}
export default function DirectEmail(props: Props) {
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
    const resolved = children(() => props.children)
    return (

      <a
        onClick={revealEmail}
        onMouseOver={revealEmail}
        href={email()}
        class={`hover:text-gray-300 ${props?.class}`}
      >
        <Show when={resolved()} fallback={'Contact me'}>
           {resolved()}
        </Show>
      </a>
    );
}