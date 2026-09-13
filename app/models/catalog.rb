# Loads content/*.yml into frozen POROs.
#
# Content lives in YAML rather than the database so that it stays diffable in
# review — the value of this site is whether each example is correct, which is a
# thing you read, not a thing you query.
class Catalog
  CONTENT_DIR = Rails.root.join("content")

  class << self
    def current
      # Reload every request in development so editing a .yml file behaves like
      # editing a view. Cached everywhere else.
      Rails.env.development? ? load : (@current ||= load)
    end

    def load
      categories = Dir[CONTENT_DIR.join("*.yml")].sort.map { Category.new(YAML.load_file(it)) }
      new(categories)
    end
  end

  attr_reader :categories

  def initialize(categories)
    @categories = categories.sort_by { [Category::PARTS.index(it.part), it.position, it.title] }.freeze
    freeze
  end

  def parts
    Category::PARTS.filter_map do |part|
      found = categories.select { it.part == part }
      [part, found] if found.any?
    end
  end

  def snippets = categories.flat_map(&:snippets)

  def find_snippet(id) = snippets.find { it.id == id }
end
