# The data was downloaded from https://data.wprdc.org/dataset/city-trees on January 4th, 2020 at 3:50pm

library(tidyverse)
library(glmnet)

# Data dictionary with column types
# convert to R friendly type names


tree_columns <- read_csv('trees_columns.csv') %>% 
  mutate(
    type = case_when(
      id == "stormwater_benefits_dollar_value" ~ "c",  # For some reason these are wrong in the provided dictionary
      id == "stems" ~ "n",
      type == "text" ~ "c",
      type == "float" ~ "n",
      type == "int" ~ "i",
      TRUE ~ "uh oh"
    ),
    id = str_replace(id, 'benfits', 'benefits') # They spelled benefits wrong for lots of columns
  ) %>% 
  arrange(ifelse(id == "diameter_base_height", 11.5, 1:n())) # Columns are mislabeled here and diameter_base_height is put at the end.


# Get rid of most of the calculated benefits columns
columns_to_keep <- tree_columns$id[
    !str_detect(tree_columns$id, "benefits") | 
    str_detect(tree_columns$id, "overall_benefits_|totalco2_lbs" )
] 

bad_species_names <- c(
  "Unknown",
  "Vacant Site Medium",
  "Vacant Site Not Suitable",
  "Stump"
)

# Read in main dataset and filter to desired columns
trees <- read_csv('pittsburgh_trees_01042020.csv',
                  skip = 1,
                  col_names = tree_columns$id, 
                  col_types = paste(tree_columns$type, collapse = "")) %>% 
  select(one_of(columns_to_keep)) %>% 
  filter(!(common_name %in% bad_species_names))

# Common species
common_species <- trees %>% 
  count(common_name) %>% 
  filter(n > 100) %>%
  pull(common_name)


trees_cleaned <- trees %>% 
  select(-diameter_base_height, -address_number) %>% 
  filter(
    common_name %in% common_species,
    longitude != 0,
    latitude != 0,
    height != 0,
    width != 0,
    !is.na(co2_benefits_totalco2_lbs),
    !is.na(overall_benefits_dollar_value),
    !is.na(stems)
  ) %>% 
  mutate(
    east_west_rel = longitude - median(longitude),
    north_south_rel = latitude - median(latitude)
  ) %>% 
  select(-longitude, -latitude) %>% 
  mutate_if(is.character, tolower) %>% 
  mutate(
    growth_space_length = ifelse(growth_space_length == 99, NA, growth_space_length),
    growth_space_width = ifelse(growth_space_width == 99, NA, growth_space_width)
  )

numeric_data <- trees_cleaned %>% 
  purrr::keep(is.numeric)

# Impute the 99s for growth_space columns
normalize_col <- function(x) (x - mean(x, na.rm = TRUE))/sd(x, na.rm = TRUE)

predictors <- numeric_data %>% 
  select(-growth_space_length, -growth_space_width) %>% 
  mutate_all(normalize_col)

outcomes <- numeric_data %>% 
  select(growth_space_length, growth_space_width) 

impute_mising_col <- function(col_to_predict){
  y <- outcomes[[col_to_predict]]
  missing_indices <- is.na(y)
  
  train_y <- y[!missing_indices]
  train_x <- predictors[!missing_indices,]
  
  missing_x <- predictors[missing_indices,]
  
  fit <- cv.glmnet(x = as.matrix(train_x), y = train_y)
  predicted_ys <- 
  
  y[missing_indices] <- predict(fit, as.matrix(missing_x))
  y
}

trees_imputed <- trees_cleaned %>% 
  mutate(
    growth_space_length = impute_mising_col("growth_space_length"),
    growth_space_width = impute_mising_col("growth_space_width")
  )


# Make sure none are missing anymore
purrr::keep(trees_imputed, is.numeric) %>% 
  pivot_longer(everything()) %>% 
  group_by(name) %>% 
  summarise(num_missing = sum(is.na(value)) )

# Check distributions for obvious outliers
purrr::keep(trees_imputed, is.numeric) %>% 
  pivot_longer(everything()) %>% 
  ggplot(aes(x = value)) +
  geom_density(fill = "forestgreen", alpha = 0.7) +
  geom_rug(alpha = 0.25) +
  facet_wrap(~name, scales = "free", ncol = 2) +
  theme(
    axis.text.y = element_blank(),
    axis.ticks.y = element_blank()
  )

trees_imputed %>% write_csv("trees_cleaned.csv")

