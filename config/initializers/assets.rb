# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = "1.0"

# Add additional assets to the asset load path.
# Rails.application.config.assets.paths << Emoji.images_path

# Vendored CodeMirror 5 — shipped with the repo rather than pulled from a CDN so
# the editor keeps working offline and is not subject to a third party's uptime.
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/javascripts")
Rails.application.config.assets.paths << Rails.root.join("vendor/assets/stylesheets")
