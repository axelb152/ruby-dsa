module SiteHelper
  PART_TITLES = {
    "structures" => "Implement it from scratch",
    "patterns"   => "Patterns",
    "idioms"     => "Ruby idioms for interviews"
  }.freeze

  def part_title(part) = PART_TITLES.fetch(part, part.humanize)

  # The catalogue is content, not request state — there is exactly one, and it
  # takes no parameters. Reaching for it here rather than assigning an ivar in
  # the action means the template renders identically from a live request and
  # from `rake site:build`, with no duplicated setup between the two.
  def catalog = Catalog.current

  # Renders `backticks` in prose as inline code. Deliberately not a full Markdown
  # pipeline: notes are one or two sentences, and the only markup they ever want is
  # a method name set apart from the sentence around it. The text is escaped first,
  # so the captured group is already safe by the time it is wrapped.
  def inline_code(text)
    ERB::Util.html_escape(text).gsub(/`([^`]+)`/) do
      %(<code class="rounded bg-slate-200/70 px-1 dark:bg-slate-800">#{$1}</code>)
    end.html_safe
  end
end
