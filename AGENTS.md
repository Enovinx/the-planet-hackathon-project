<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

This is a typescript project. Always use typescript. With .ts files etc. 

Avoid using the any type.

Use pnpm instead of npm for all commands, this project uses the pnpm package manager.

Be carefull not to use commands that will not return, as this will block your session and I will have to intervene (which is annoying for me and wastes a lot of my time)

When you start work, let me know if you are on main, so I can create a worktree/branch before you make unintentional changes on main, this is needed because I am working with a team.
When you start work and branch from main, check git status to make sure we are up to date with remote and pull and merge if needed.