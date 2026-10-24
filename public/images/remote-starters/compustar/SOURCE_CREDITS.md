# Compustar product imagery

## Release policy (winter remote starters)

- **Customer-facing UI** uses `product-showcase-placeholder.svg` while `COMPUSTAR_USE_AUTHORIZED_PRODUCT_IMAGERY` is `false` in `lib/constants/compustar-remote-starters.ts`.
- **Do not commit or deploy** manufacturer product JPEGs until written Firstech/Compustar dealer or media permission is on file.

## Reference files (not for release commit)

These were downloaded from Compustar’s asset CDN for internal reference only. **Not licensed for publication** in-repo.

| File | Source |
|------|--------|
| `cs4905-s-kit.jpg` | [CS4905-S-KIT](https://www.compustar.com/bundles/cs4905-s-kit/) |
| `q9.jpg` | [Q9](https://www.compustar.com/remotes/q9-with-lte/) |
| `pro-r5.jpg` | [PRO R5](https://www.compustar.com/remotes/pro-r5-w-lte/) |
| `pro-t13.jpg` | [PRO T13](https://www.compustar.com/remotes/pro-t13-w-lte/) |

## Shipped placeholder

| File | Notes |
|------|--------|
| `product-showcase-placeholder.svg` | Neutral AutoDV8ions artwork — abstract remote silhouette, no brand marks, not a specific product photo. |

After approval: set `COMPUSTAR_USE_AUTHORIZED_PRODUCT_IMAGERY` to `true`, add authorized assets (or approved local JPEGs), and update this file with permission reference.
