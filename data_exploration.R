# The data was downloaded from https://data.wprdc.org/dataset/city-trees on January 4th, 2020 at 3:50pm

library(tidyverse)

# Data dictionary with column types
# convert to R friendly type names
tree_columns <- read_csv('trees_columns.csv') %>% 
  mutate(type = case_when(
    id == "stormwater_benefits_dollar_value" ~ "c",  # For some reason these are wrong in the provided dictionary
    id == "stems" ~ "n",
    type == "text" ~ "c",
    type == "float" ~ "n",
    type == "int" ~ "i",
    TRUE ~ "uh oh"
  ))

# Get rid of most of the calculated benefits columns
columns_to_keep <- tree_columns$id[
    !str_detect(tree_columns$id, "benefits") | 
    str_detect(tree_columns$id, "overall_benefits_dollar_value")
] 

# Read in main dataset and filter to desired columns
trees <- read_csv('pittsburgh_trees_01042020.csv',
                  skip = 1,
                  col_names = tree_columns$id, 
                  col_types = paste(tree_columns$type, collapse = "")) %>% 
  select(one_of(columns_to_keep))

