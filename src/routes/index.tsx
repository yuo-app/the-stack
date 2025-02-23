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
    <main class="w-full p-4 space-y-4">
      <Show when={auth.status() === 'unauthenticated'}>
        <button
          class="p-2 bg-gray-800 text-white rounded"
          onClick={() => auth.signIn('github')}
        >
          Login with GitHub
        </button>
      </Show>
      <Show when={auth.status() === 'authenticated'}>
        <div class="space-y-2">
          <h2 class="font-bold text-3xl">
            Hello, {auth.session()?.user?.name}!
          </h2>
          <button
            class="p-2 bg-red-500 text-white rounded"
            onClick={() => auth.signOut()}
          >
            Logout
          </button>
        </div>
      </Show>
      <div>
        <button
          class="p-2 bg-blue-500 text-white rounded"
          onClick={addPost}
        >
          Add Post
        </button>
        <ul class="space-y-2 decoration-none">
          <For each={posts}>
            {post => (
              <li class="p-2 bg-gray-100 rounded">
                <h3 class="font-bold text-xl">{post.title}</h3>
                <p>{post.content}</p>
                <button
                  class="p-2 bg-red-500 text-white rounded"
                  onClick={() => removePost(post.id)}
                >
                  X
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </main>
  )
}
