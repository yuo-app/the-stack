import type { Post } from '~/db/schema/local'
import { useAuth } from '@solid-mediakit/auth/client'
import { open } from '@tauri-apps/plugin-shell'
import { eq } from 'drizzle-orm'
import { For, onMount, Show } from 'solid-js'
import { createStore } from 'solid-js/store'
import { localDb } from '~/db'
import { Posts } from '~/db/schema/local'
import { useStore } from '~/stores/store'

export default function Home() {
  const auth = useAuth()
  const [store] = useStore()
  const [posts, setPosts] = createStore<Post[]>([])

  onMount(async () => {
    await store.initialized
    const loadedPosts = await localDb
      .select()
      .from(Posts)
      .orderBy(Posts.created_at)
      .all()
    setPosts(loadedPosts)
  })

  async function addPost() {
    const newPost = await localDb
      .insert(Posts)
      .values({ title: 'New Post', content: 'Hello World!' })
      .returning()
      .get()
    setPosts(posts.length, newPost)
  }

  async function removePost(id: string) {
    await localDb.delete(Posts).where(eq(Posts.id, id)).run()
    setPosts(posts.filter(post => post.id !== id))
  }

  async function signInWithGithub() {
    const { url } = await auth.signIn('github', { redirect: false, callbackUrl: '/' })
    if (url)
      await open(url)
  }

  return (
    <main class="min-h-screen bg-zinc-900 text-emerald-100 p-6 font-mono relative">
      <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_1px,#18181b_1px),linear-gradient(90deg,transparent_1px,#18181b_1px)] bg-[size:32px_32px] opacity-20" />
      <div class="max-w-3xl mx-auto space-y-6 relative">
        <Show when={auth.status() === 'unauthenticated'}>
          <div class="flex justify-end">
            <button
              class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-emerald-900/30 hover:border-emerald-800/50 text-sm font-mono tracking-wider transition-all duration-200"
              onClick={signInWithGithub}
            >
              Sign in with GitHub
            </button>
          </div>
        </Show>

        <Show when={auth.status() === 'authenticated'}>
          <div class="flex items-center justify-between bg-zinc-800/50 backdrop-blur rounded p-4 border border-emerald-900/30">
            <h2 class="text-xl font-mono tracking-tight">
              {'>'} {auth.session()?.user?.name}
            </h2>
            <button
              class="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 rounded border border-red-900/30 hover:border-red-800/50 text-sm tracking-wider transition-all duration-200"
              onClick={() => auth.signOut()}
            >
              /logout
            </button>
          </div>
        </Show>

        <div class="space-y-4">
          <div class="flex justify-between items-center border-b border-emerald-900/30 pb-2">
            <h3 class="text-lg font-mono tracking-wide text-emerald-200">posts</h3>
            <button
              class="px-4 py-2 bg-emerald-900/20 hover:bg-emerald-900/40 rounded border border-emerald-900/30 hover:border-emerald-800/50 text-sm tracking-wider transition-all duration-200"
              onClick={addPost}
            >
              + new
            </button>
          </div>

          <Show
            when={posts.length > 0}
            fallback={(
              <div class="bg-zinc-800/50 backdrop-blur rounded p-6 text-center border border-emerald-900/30">
                <p class="text-emerald-400/60 font-mono">no entries found_</p>
              </div>
            )}
          >
            <ul class="space-y-3">
              <For each={posts}>
                {post => (
                  <li class="bg-zinc-800/50 backdrop-blur rounded p-4 flex justify-between items-start border border-emerald-900/30 hover:border-emerald-800/50 group transition-all duration-200">
                    <div class="space-y-2">
                      <h4 class="text-lg font-mono text-emerald-200">{post.title}</h4>
                      <p class="text-emerald-100/70 font-mono text-sm">{post.content}</p>
                      <p class="text-xs text-emerald-500/50 font-mono">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      class="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-900/30 rounded transition-all duration-200"
                      onClick={() => removePost(post.id)}
                    >
                      <svg class="w-5 h-5 text-red-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </div>
    </main>
  )
}
