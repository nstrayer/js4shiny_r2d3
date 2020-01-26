library(tidyverse)
library(glmnet)

trees <- read_csv("trees_cleaned.csv")


# trees$common_name %>% unique()
species_1 <- "maple: hedge"
species_2 <- "redbud: eastern"

species_data <- trees %>% 
  select(-id, -street, -scientific_name) %>% 
  filter(common_name == species_1 | common_name == species_2) %>% 
  drop_na()

species_data %>% filter_a

predictors <-  model.matrix( ~ ., select(species_data, -common_name))

is_species_1 <- species_data$common_name == species_1

nrow(species_data)
dim(predictors)
length(is_species_1)

fit <- cv.glmnet(x = predictors, y = is_species_1, family = "binomial")

coef(fit)