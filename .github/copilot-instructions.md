# Our stack

SolidStart (SolidJS), Auth.js, drizzle-orm, sqlocal, Turso, Cloudflare

We use a remote Turso database for auth and user related data.
sqlocal is a drizzle driver for sqlite wasm which uses OPFS. We use it to store other data locally.

## Additional notes

- Don't leave unnecessary comments in the code. Comments should be used to explain why something is done, not what is done. The code should be self-explanatory.
