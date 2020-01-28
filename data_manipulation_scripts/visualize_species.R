library(tidyverse)

trees <- read_csv("data/trees_cleaned.csv")

# scatterplot of median height and width by species
tree_species <- trees %>% 
  group_by(common_name) %>% 
  summarise_if(is.numeric, mean)
  # summarise(height = mean(height), width = mean(width),
  #           n_obs = n(),
  #           north_south = mean(north_south_rel),
  #           east_west = mean(east_west_rel))

tree_benefits <- trees %>% 
  group_by(common_name) %>% 
  summarise(num_obs = n(),
            dollar_benefits = mean(overall_benefits_dollar_value),
            co2_benefits = mean(co2_benefits_totalco2_lbs))

write_csv(tree_benefits, 'data/tree_benefits.csv')



tree_benefits %>% 
  ggplot(aes(x = dollar_benefits, y = co2_benefits)) +
  scale_x_log10() +
  scale_y_log10() +
  geom_point(alpha = 0.5) 

tree_species %>% 
  ggplot(aes(x = reorder(common_name, -n_obs), y = n_obs)) +
  geom_col()




