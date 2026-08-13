import { useEffect, useRef, useState } from 'react';
import { fetchInstagramPosts, type InstagramPost } from '../lib/api';

const FALLBACK_POSTS = [
  {
    id: 'fallback-brasil-1995',
    href: 'https://www.instagram.com/p/DWKnH2ZDa8s/',
    src: '/instagram/post-1.png',
    alt: 'Camisa Brasil 1995/96 de jogo, número 17',
  },
  {
    id: 'fallback-juventude-1999',
    href: 'https://www.instagram.com/p/DWKl85yjcqv/',
    src: '/instagram/post-2.png',
    alt: 'Camisa Juventude 1999 branca',
  },
  {
    id: 'fallback-gremio-1997',
    href: 'https://www.instagram.com/p/DWKk7hcjXkg/',
    src: '/instagram/post-3.png',
    alt: 'Camisa Grêmio 1997 listrada',
  },
] as const;

export function InstagramSection() {
  const calloutRef = useRef<HTMLElement>(null);
  const [calloutVisible, setCalloutVisible] = useState(false);
  const [posts, setPosts] = useState<readonly InstagramPost[]>(FALLBACK_POSTS);

  useEffect(() => {
    const controller = new AbortController();
    fetchInstagramPosts(controller.signal)
      .then((latestPosts) => {
        if (latestPosts.length === 0) return;
        setPosts(
          FALLBACK_POSTS.map((fallback, index) => latestPosts[index] ?? fallback),
        );
      })
      .catch(() => {
        // A vitrine local permanece visível se o token expirar ou a Meta cair.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const element = calloutRef.current;
    if (!element || !('IntersectionObserver' in window)) {
      setCalloutVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCalloutVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section
        ref={calloutRef}
        className={`store-insta-callout${calloutVisible ? ' is-visible' : ''}`}
      >
        <h2>
          <span>NOS</span>{' '}
          <span className="store-outline-text">SIGA</span>{' '}
          <span className="store-insta-callout-last">NO INSTA!</span>
        </h2>
      </section>

      <section className="store-instagram" aria-labelledby="instagram-title">
        <div className="store-container">
          <div className="store-instagram-layout">
            <a
              href="https://instagram.com/soccerpika"
              target="_blank"
              rel="noopener noreferrer"
              className="store-instagram-title"
            >
              <h2 id="instagram-title">@SOCCERPIKA</h2>
              <span>Siga-nos no Instagram</span>
            </a>

            <ul className="store-instagram-track">
              {posts.map((post, index) => (
                <li key={post.id}>
                  <a href={post.href} target="_blank" rel="noopener noreferrer">
                    <img
                      src={post.src}
                      alt={post.alt}
                      loading="lazy"
                      decoding="async"
                      width="400"
                      height="400"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setPosts((currentPosts) => {
                          const fallback = FALLBACK_POSTS[index];
                          if (currentPosts[index]?.id === fallback.id) return currentPosts;
                          return currentPosts.map((currentPost, currentIndex) =>
                            currentIndex === index ? fallback : currentPost,
                          );
                        });
                      }}
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
