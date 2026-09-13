# One section of the page: a heading, an explanation, and its snippets.
class Category
  PARTS = %w[structures patterns idioms].freeze

  attr_reader :slug, :part, :title, :blurb, :position, :snippets

  def initialize(attrs)
    @slug     = attrs.fetch("slug")
    @title    = attrs.fetch("title")
    @part     = attrs.fetch("part", "patterns")
    @blurb    = attrs["blurb"].to_s.strip.presence
    @position = attrs.fetch("position", Float::INFINITY)
    @snippets = Array(attrs["snippets"]).map { Snippet.new(category: self, attrs: it) }.freeze

    unless PARTS.include?(@part)
      raise ArgumentError, "#{@slug}: part must be one of #{PARTS.join(", ")}, got #{@part.inspect}"
    end
    freeze
  end

  def todo? = snippets.empty?
end
