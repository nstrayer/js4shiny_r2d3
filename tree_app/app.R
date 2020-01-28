library(shiny)
library(tidyverse)
library(glmnet)
library(r2d3)

# Read in data 
trees <- read_csv("../data/trees_cleaned.csv") %>% 
  select(-id, -street, -scientific_name)

# Get summary level info for plotting
tree_benefits <- read_csv("../data/tree_benefits.csv")

# Define UI for application that draws a histogram
ui <- fluidPage(
  # Application title
  titlePanel("Which Tree Is That?"),
  hr(),
  d3Output("tree_viz"),     # The output of d3 viz
  selectInput('species_1',
              label =  "Species 1",
              choices = tree_benefits$common_name,
              selected = sample(tree_benefits$common_name, 1)),
  selectInput('species_2',
              label =  "Species 2",
              choices = tree_benefits$common_name,
              selected = sample(tree_benefits$common_name, 1)),
  h2("Regression Results"),
  plotOutput("regressionOutput")
)

# Define server logic required to draw a histogram
server <- function(input, output) {
  
  # Runs r2d3 and sends to UI
  output$tree_viz <- renderD3({
    r2d3(data = tree_benefits, script = "tree_viz.js")
  })
  
  output$regressionOutput <- renderPlot({
    species_1 <- input$species_1
    species_2 <- input$species_2
    
    if(species_1 == species_2){
      stop("Need two different selected species")
    }
    
    species_data <- trees %>% filter(common_name == species_1 | common_name == species_2)  
    
    predictors_df <- species_data %>% 
      select(-common_name) %>% 
      rename_if(is.character, function(name) paste0(name,"__")) %>% 
      rename_if(is.numeric, function(name) paste0("numeric__",name)) 
    
    predictors <-  model.matrix( ~ ., predictors_df)
    is_species_1 <- species_data$common_name == species_1
    
    fit <- cv.glmnet(x = predictors, y = is_species_1, family = "binomial", nfolds = 5)
    
    plot_title <- glue::glue("Coeffients of model to predict \"{species_1}\" or \"{species_2}\"")
    plot_subtitle <- glue::glue("LASSO regression. Predicting 1 = \"{species_1}\", 0 = \"{species_2}\"")
    
    coef(fit) %>% {
      tibble(
        variable = rownames(.),
        coefficient = .[,1]
      )} %>% 
      filter(coefficient != 0, variable != "(Intercept)") %>% 
      arrange(coefficient) %>% 
      separate(variable, into = c("category", "variable"), sep = "__") %>% 
      mutate(
        variable = str_replace_all(variable, "_", " "),
        positive = coefficient > 0) %>% 
      ggplot( aes(x = coefficient, y = reorder(variable, coefficient), color = positive )) +
      geom_point() +
      geom_segment(aes(xend = 0, yend = variable)) +
      facet_grid(rows = vars(category), space = "free_y", scales = "free_y", switch = "both") +
      guides(color = FALSE) +
      geom_vline(xintercept = 0, alpha = 0.4) +
      labs(title = plot_title,
           subtitle = plot_subtitle, 
           y = "")
  })
}

# Run the application 
shinyApp(ui = ui, server = server)
