library(tidyverse)

trees <- read_csv("trees_cleaned.csv")

# scatterplot of median height and width by species
tree_species <- trees %>% 
  group_by(common_name) %>% 
  summarise_if(is.numeric, mean)
  # summarise(height = mean(height), width = mean(width),
  #           n_obs = n(),
  #           north_south = mean(north_south_rel),
  #           east_west = mean(east_west_rel))

tree_species %>% 
  ggplot(aes(x = overall_benefits_dollar_value, y = co2_benefits_totalco2_lbs)) +
  scale_x_log10() +
  scale_y_log10() +
  geom_point(alpha = 0.5) 

tree_species %>% 
  ggplot(aes(x = reorder(common_name, -n_obs), y = n_obs)) +
  geom_col()




