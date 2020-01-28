library(tidyverse)
library(glmnet)

trees <- read_csv("trees_cleaned.csv") %>% select(-id, -street, -scientific_name)

# trees$common_name %>% unique()
species_1 <-"elm: siberian"
species_2 <- "redbud: eastern"
# species_1 <- "maple: hedge"

species_data <- trees %>% filter(common_name == species_1 | common_name == species_2)  

# 
# species_data %>%
#   purrr::keep(is.character) %>%
#   pivot_longer(everything()) %>%
#   group_by(name) %>%
#   summarise(n_unique = length(unique(value)))


# Add a suffix next to categorical variables so we know what they are later
predictors_df <- species_data %>% 
  select(-common_name) %>% 
  rename_if(is.character, function(name) paste0(name,"__")) %>% 
  rename_if(is.numeric, function(name) paste0("numeric__",name)) 
  

predictors <-  model.matrix( ~ ., predictors_df)
is_species_1 <- species_data$common_name == species_1

fit <- cv.glmnet(x = predictors, y = is_species_1, family = "binomial")


model_results <- coef(fit) %>% {
  tibble(
    variable = rownames(.),
    coefficient = .[,1]
  )} %>% 
  filter(coefficient != 0, variable != "(Intercept)") %>% 
  arrange(coefficient) %>% 
  separate(variable, into = c("category", "variable"), sep = "__") %>% 
  mutate(
    variable = str_replace_all(variable, "_", " "),
    positive = coefficient > 0)

plot_title <- glue::glue("Coeffients of model to predict \"{species_1}\" or \"{species_2}\"")
plot_subtitle <- glue::glue("LASSO regression. Predicting 1 = \"{species_1}\", 0 = \"{species_2}\"")
ggplot(model_results, aes(x = coefficient, y = reorder(variable, coefficient), color = positive )) +
  geom_point() +
  geom_segment(aes(xend = 0, yend = variable)) +
  facet_grid(rows = vars(category), space = "free_y", scales = "free_y", switch = "both") +
  guides(color = FALSE) +
  geom_vline(xintercept = 0, alpha = 0.4) +
  labs(title = plot_title,
       subtitle = plot_subtitle, 
       y = "")
  
