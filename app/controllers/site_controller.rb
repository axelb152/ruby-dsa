class SiteController < ApplicationController
  def index
    @catalog = Catalog.current
  end
end
