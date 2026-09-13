Rails.application.routes.draw do
  root "site#index"
  get "up" => "rails/health#show", as: :rails_health_check
end
