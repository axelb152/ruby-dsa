module SiteHelper
  PART_TITLES = {
    "structures" => "Implement it from scratch",
    "patterns"   => "Patterns",
    "idioms"     => "Ruby idioms for interviews"
  }.freeze

  def part_title(part) = PART_TITLES.fetch(part, part.humanize)
end
