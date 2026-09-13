# A single runnable example. Immutable: the catalogue is content, not state.
class Snippet
  attr_reader :category, :slug, :title, :time, :space, :notes, :code, :expected

  def initialize(category:, attrs:)
    @category = category
    @slug     = attrs.fetch("slug")
    @title    = attrs.fetch("title")
    @code     = attrs.fetch("code")
    @expected = attrs.fetch("expected", "")
    @time     = attrs["time"]
    @space    = attrs["space"]
    @notes    = attrs["notes"].to_s.strip.presence
    freeze
  end

  def id = "#{category.slug}--#{slug}"

  # Namespaces the browser's saved edit. Changing a snippet's source changes the
  # key, so a stale localStorage entry can never shadow an updated example.
  def storage_key = "dsa:#{id}:#{code_digest}"

  def code_digest = Digest::SHA256.hexdigest(code)[0, 8]

  def todo? = code.blank?
end
