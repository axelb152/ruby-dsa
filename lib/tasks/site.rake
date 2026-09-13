namespace :site do
  OUTPUT = Rails.root.join("_site")

  desc "Render the site into _site/ for static hosting"
  task build: :environment do
    Rake::Task["assets:precompile"].invoke

    FileUtils.rm_rf(OUTPUT)
    FileUtils.mkdir_p(OUTPUT)

    # Propshaft writes digested assets into public/; everything else in public/
    # (icons, robots.txt, the static error pages) ships as-is.
    FileUtils.cp_r(Dir[Rails.root.join("public", "*")], OUTPUT)

    # SiteController's renderer, not ApplicationController's: partials resolve
    # against the controller's view prefixes, so "big_o" is only found under site/.
    html = SiteController.renderer.render(template: "site/index", layout: "layouts/application")
    File.write(OUTPUT.join("index.html"), Site::Build.root_relative(html))

    # GitHub Pages runs Jekyll unless told not to, and Jekyll skips files and
    # directories beginning with an underscore.
    FileUtils.touch(OUTPUT.join(".nojekyll"))

    puts "built #{OUTPUT.relative_path_from(Rails.root)}/ (#{Dir[OUTPUT.join("**/*")].count { File.file?(it) }} files)"
  end

  desc "Serve _site/ exactly as a static host would"
  task :serve do
    Dir.chdir(OUTPUT) { exec("ruby", "-run", "-e", "httpd", ".", "-p", "4000") }
  end
end

module Site
  module Build
    # Rewrites every quoted root-absolute URL ("/assets/x") to a document-relative
    # one ("./assets/x").
    #
    # A GitHub Pages *project* site is served from /<repo>/, so root-absolute URLs
    # would 404. Relative ones make the same build work at a subpath, at a domain
    # root, and over file://, without baking the repository name into the output.
    #
    # This deliberately matches quoted values rather than specific attributes: the
    # importmap's URLs live inside a JSON <script> body, and missing those breaks
    # every module on the page. The "./" prefix is required there — an import map
    # address without a leading "/", "./" or "../" is a bare specifier, not a URL.
    def self.root_relative(html)
      html.gsub(%r{"/(?!/)}, %q{"./})
    end
  end
end
