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

undesired_columns <- c("council_district", "ward", "tract", "public_works_division", "pli_division", "pli_division", "police_zone", "fire_zone")

columns_to_keep <- tree_columns %>% 
  filter(
    !str_detect(id, "benefits") | str_detect(id, "overall_benefits_|totalco2_lbs"),
    !(id %in% undesired_columns) 
  ) %>% pull(id)

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
  filter(!(common_name %in% bad_species_names)) %>% 
  mutate_if(is.character, tolower) 
  

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
    !is.na(stems),
    !is.na(condition),
    condition != "n/a"
  ) %>% 
  mutate(
    east_west_rel = longitude - median(longitude),
    north_south_rel = latitude - median(latitude)
  ) %>% 
  select(-longitude, -latitude) %>% 
  mutate(
    growth_space_length = ifelse(growth_space_length == 99, NA, growth_space_length),
    growth_space_width = ifelse(growth_space_width == 99, NA, growth_space_width)
  )


# Lots of neighborhood names. Collapse some and similar ones and 
# recode uncommon neighborhoods to "other"
neighborhood_recoding <- trees_cleaned %>% 
  select(neighborhood) %>% 
  mutate(
    new_name = case_when(
      str_detect(neighborhood, "allegheny") ~ "allegheny",
      str_detect(neighborhood, "arlington") ~ "arlington",
      str_detect(neighborhood, "homewood") ~ "homewood",
      TRUE ~ neighborhood)
  ) %>% 
  group_by(neighborhood) %>% 
  summarise(
    new_name = first(new_name),
    num_obs = n()) %>% 
  ungroup() %>% 
  filter(num_obs > 150) %>% 
  select(neighborhood, new_name) 


# Also lots of uncommon land use scenarios
land_use_recoding <- trees_cleaned %>% 
  select(land_use) %>% 
  count(land_use) %>% 
  arrange(n) %>% 
  mutate(new_land_use = ifelse(n < 50, "other", land_use)) %>% 
  select(-n)


growth_space_recode <- trees_cleaned %>% 
  select(growth_space_type) %>% 
  count(growth_space_type) %>% 
  mutate(new_growth_space_type = ifelse(n < 100, "other", growth_space_type)) %>% 
  select(-n)


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
  
  coef(fit)
  y[missing_indices] <- predict(fit, as.matrix(missing_x))
  y
}

trees_imputed <- trees_cleaned %>% 
  mutate(
    growth_space_length = impute_mising_col("growth_space_length"),
    growth_space_width = impute_mising_col("growth_space_width")
  ) %>% 
  left_join(neighborhood_recoding, by = "neighborhood") %>% 
  select(-neighborhood) %>%
  rename(neighborhood = new_name) %>% 
  left_join(land_use_recoding, by = "land_use") %>% 
  select(-land_use) %>%
  rename(land_use = new_land_use) %>% 
  left_join(growth_space_recode, by = "growth_space_type") %>% 
  select(-growth_space_type) %>%
  rename(growth_space_type = new_growth_space_type) %>% 
  mutate(
    neighborhood = ifelse(is.na(neighborhood), "other", neighborhood),
    land_use = ifelse(is.na(land_use), "other", land_use)
  )


categorical_tidy <- trees_imputed %>% 
  select(-street, -id) %>% 
  purrr::keep(is.character) %>% 
  pivot_longer(everything())

categorical_tidy %>% 
  group_by(name) %>% 
  summarise(n_unique = length(unique(value)),
            n_missing = sum(is.na(value)))

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




