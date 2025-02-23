import type { Post } from '~/db/schema/local'
import { useAuth } from '@solid-mediakit/auth/client'
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

  return (
    <main class="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div class="max-w-4xl mx-auto space-y-6">
        {/* Auth Section */}
        <Show when={auth.status() === 'unauthenticated'}>
          <div class="flex justify-end">
            <button
              class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 border border-gray-700 hover:border-gray-600 text-sm font-medium"
              onClick={() => auth.signIn('github')}
            >
              Sign in with GitHub
            </button>
          </div>
        </Show>

        <Show when={auth.status() === 'authenticated'}>
          <div class="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 class="text-2xl font-semibold tracking-tight">
              Welcome, {auth.session()?.user?.name}
            </h2>
            <button
              class="px-4 py-2 bg-red-900/50 hover:bg-red-900/70 rounded-lg transition-colors duration-200 text-sm font-medium"
              onClick={() => auth.signOut()}
            >
              Sign Out
            </button>
          </div>
        </Show>

        {/* Posts Section */}
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-300">Your Posts</h3>
            <button
              class="px-4 py-2 bg-blue-900/50 hover:bg-blue-900/70 rounded-lg transition-colors duration-200 text-sm font-medium"
              onClick={addPost}
            >
              + New Post
            </button>
          </div>

          <Show
            when={posts.length > 0}
            fallback={
              <div class="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
                <p class="text-gray-400">No posts yet. Create your first one!</p>
              </div>
            }
          >
            <ul class="space-y-3">
              <For each={posts}>
                {post => (
                  <li class="bg-gray-800 rounded-lg p-4 flex justify-between items-start border border-gray-700 hover:border-gray-600 transition-colors duration-200">
                    <div class="space-y-1">
                      <h4 class="text-lg font-medium text-gray-100">{post.title}</h4>
                      <p class="text-gray-400 text-sm">{post.content}</p>
                      <p class="text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      class="p-2 hover:bg-red-900/50 rounded-lg transition-colors duration-200"
                      onClick={() => removePost(post.id)}
                    >
                      <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
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
