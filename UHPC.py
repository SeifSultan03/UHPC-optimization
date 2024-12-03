import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize
from matplotlib.ticker import FuncFormatter
import io

excel_file = "UHPC.xlsx"
df = pd.read_excel(excel_file, sheet_name='Sheet2')
d = df['Particle diameter'].values

# function to create PSD graph
def create_psd(file_list, userInfo):

    plt.figure(figsize=(8, 6))
    
    userTemplate = userInfo["template"]
    userValuesStartColumn = userTemplate["values"]["start"]["column"]
    userValuesEndColumn = userTemplate["values"]["end"]["column"]
    userValuesStartRow = userTemplate["values"]["start"]["row"]
    userValuesEndRow = userTemplate["values"]["end"]["row"] + 1
    userParticlesStartColumn = userTemplate["particles"]["start"]["column"]
    userParticlesEndColumn = userTemplate["particles"]["end"]["column"]
    userParticlesStartRow = userTemplate["particles"]["start"]["row"]
    userParticlesEndRow = userTemplate["particles"]["end"]["row"] + 1
    userSheetName = userInfo["sheet_name"]
    df = pd.read_excel(file_list[0], sheet_name=userSheetName,header=None)
    d =  df.iloc[userParticlesStartRow:userParticlesEndRow,userParticlesEndColumn].values
    print(d)
    d_plot = d
    colors = ['blue', 'orange', 'red', 'yellow', 'green']


    i = 0
    for file in file_list:
        ds = pd.read_excel(file.path, sheet_name=userSheetName, header=None)
        values = ds.iloc[userValuesStartRow:userValuesEndRow,userValuesEndColumn].values
        plt.plot(d_plot, np.cumsum(values), label=file.material, color=colors[i], marker='o')
        i += 1
    
    plt.xscale('log') 
    plt.xlabel('Particle Diameter (μm)')
    plt.ylabel('Passing Percentage (%)')
    plt.title('Particle Size Distribution')

    plt.xlim(left=d_plot.min(), right=500)
    formatter = FuncFormatter(lambda x, _: f'{x:.0f}')
    plt.gca().xaxis.set_major_formatter(formatter)
    plt.xticks([d_plot.min(), 10, 100, 500])
    plt.grid(True, which="both", ls="--")
    plt.legend()
    
    img = io.BytesIO()
    plt.savefig(img, format='png', dpi=300)
    img.seek(0)
    plt.close()
    return {'img' : img}

def create_graph(file_list, userInfo):
    fileVolumes = {}
    userTemplate = userInfo["template"]
    userValuesStartColumn = userTemplate["values"]["start"]["column"]
    userValuesEndColumn = userTemplate["values"]["end"]["column"]
    userValuesStartRow = userTemplate["values"]["start"]["row"]
    userValuesEndRow = userTemplate["values"]["end"]["row"] + 1
    userParticlesStartColumn = userTemplate["particles"]["start"]["column"]
    userParticlesEndColumn = userTemplate["particles"]["end"]["column"]
    userParticlesStartRow = userTemplate["particles"]["start"]["row"]
    userParticlesEndRow = userTemplate["particles"]["end"]["row"] + 1
    userSheetName = userInfo["sheet_name"]

    #df['Particle diameter'].values

    # for each file we get the particle volumes
    for file in file_list:
        ds = pd.read_excel(file.path, sheet_name=userSheetName,header=None)
        print(userValuesStartRow)
        print(userValuesEndRow)
        print(userValuesEndColumn)
        fileVolumes.setdefault(file.material, ds.iloc[userValuesStartRow:userValuesEndRow,userValuesEndColumn].values)

    def optimal_psd_function(d, q, min_d, max_d):
        d = np.array(d)
        alpha = (((d**q) - (min_d**q)) / ((max_d**q) - (min_d**q))) * 100
        return alpha

    # assuming that all file lists have the same particle diameters get the diamaters:
    df = pd.read_excel(file_list[0], sheet_name=userSheetName,header=None)
    d =  df.iloc[userParticlesStartRow:userParticlesEndRow,userParticlesEndColumn].values
    q = 0.25
    min_d = d[0]
    max_d = d[d.size-1]

    alpha = optimal_psd_function(d, q, min_d, max_d)

    # Fixed value for Weight_OPC
    Weight_OPC = 1.0

    # Define the RMSE function to minimize
    def rmse_function(weights):
        Total_Volume = 0
        Binder = 0
        i = 0
        for material, values in fileVolumes.items():
            if(userInfo["materials"][material]["Type"] == "OPC"):
                Total_Volume += 1/userInfo["materials"][material]["Density"]
            else:
                Total_Volume += weights[i]/userInfo["materials"][material]["Density"]
                i+=1

        i=0
        for material, values in fileVolumes.items():
            if(userInfo["materials"][material]["Type"] == "OPC"):
                Binder += (values * 1)/(Total_Volume * userInfo["materials"][material]["Density"])
            else:
                Binder += (values * weights[i])/(Total_Volume * userInfo["materials"][material]["Density"])
                i+=1

        # Create a cumulative column based on Binder
        cumulative = np.cumsum(Binder)

        # Save cumulative to be used for MAE calculation
        rmse_function.cumulative = cumulative
        rmse = np.sqrt(np.mean((alpha - cumulative)**2))
        return rmse


    # Initial guess for the weights [Weight_SF, Weight_SS, Weight_Slag]
    initial_guess = []#[0.1, 1.0, 1.0 / 10]  # An initial guess within the acceptable range for Weight_Slag

    # Function to dynamically set bounds for weights
    def get_bounds():
        bounds = []
        initial_guess.clear()
        i = 0
        for material, values in fileVolumes.items():
            if(userInfo["materials"][material]["Type"] == "OPC"):
                continue
            lowerBound = userInfo["materials"][material]["Bounds"]["lower"][0]
            upperBound = userInfo["materials"][material]["Bounds"]["upper"][0]

            bounds.append((0 if lowerBound < 0 else lowerBound, None if upperBound < 0 else upperBound))

            initial_guess.append(bounds[i][0])
            i+=1


        return bounds #[(0, 0.2), (1, None), (0, None)]

    get_bounds()
    # List of optimization methods that support bounds
    methods = ['L-BFGS-B', 'TNC', 'SLSQP']

    rmseString = ""
    for method in methods:
        bounds = get_bounds()
        result = minimize(rmse_function, initial_guess, bounds=bounds, method=method)
        
        # Extract the optimal weights
        optimal_weights = result.x
        
        # Calculate the cumulative Binder values for the optimal weights
        cumulative = rmse_function.cumulative
        
        # Calculate MAE
        mae = np.mean(np.abs(alpha - cumulative))
        
        # Format the output for this method
        rmseString += f"Method: {method}\n"
        rmseString += "Optimal weights (with Weight_OPC fixed at 1.0):\n"
        rmseString += "OPC = {:.3f}\n".format(Weight_OPC)
        j = 0
        for i, material in enumerate(fileVolumes.keys()):
            if(material == "Cement"):
                continue
            rmseString += "{} = {:.3f}\n".format(material, optimal_weights[j])
            j+=1
        rmseString += "<span>Minimum RMSE = {:.3f}\n</span>".format(result.fun)
        rmseString += "<span>MAE = {:.3f}\n\n</span>".format(mae)

    ################################################
    ################################################
    ################################################

    def optimal_psd_function(d, q, min_d, max_d):
        d = np.array(d)
        alpha = (((d**q) - (min_d**q)) / ((max_d**q) - (min_d**q))) * 100
        return alpha

    q = 0.25
    min_d = d[0]
    max_d = d[d.size-1]

    alpha = optimal_psd_function(d, q, min_d, max_d)

    # Fixed value for Weight_OPC
    Weight_OPC = 1.0

    # Optimization with no boundaries
    initial_guess = []#[0.1, 1.0, 1.0 / 10]
    def get_bounds_no_boundaries():
        bounds = []
        initial_guess.clear()
        i = 0
        for material, values in fileVolumes.items():
            if(userInfo["materials"][material]["Type"] == "OPC"):
                continue
            bounds.append((0, None))
            initial_guess.append(0)
            i+=1
        return bounds
    bounds_no_boundaries = get_bounds_no_boundaries() #[(0, None), (0, None), (0, None)]
    
    result_no_boundaries = minimize(rmse_function, initial_guess, bounds=bounds_no_boundaries, method='L-BFGS-B')
    optimal_weights_no_boundaries = result_no_boundaries.x
    No_Boundaries = rmse_function.cumulative

    # Optimization with specific bounds
    def get_bounds_balanced():
        bounds = []
        initial_guess.clear()
        i = 0
        for material, values in fileVolumes.items():
            if(userInfo["materials"][material]["Type"] == "OPC"):
                continue

            lowerBound = userInfo["materials"][material]["Bounds"]["lower"][0]
            upperBound = userInfo["materials"][material]["Bounds"]["upper"][0]

            #SCM
            #if it has  an upper bounds then make sure to in clude it
            if(userInfo["materials"][material]["Type"] == "SCM"):
                if(upperBound < 0):
                    bounds.append((0.091, None))
                else:
                    bounds.append((0 ,upperBound))
            if(userInfo["materials"][material]["Type"] == "FA"):
                bounds.append((0, None))
            

            initial_guess.append(bounds[i][0])
            i+=1

        return bounds
        #return [(0, 0.2), (0, None), (0.091, None)]

    result_balanced = minimize(rmse_function, initial_guess, bounds=get_bounds_balanced(), method='L-BFGS-B')
    optimal_weights_balanced = result_balanced.x
    Balanced = rmse_function.cumulative

    def get_bounds_economical():
        bounds = []
        initial_guess.clear()
        i = 0
        for material, values in fileVolumes.items():
            if(userInfo["materials"][material]["Type"] == "OPC"):
                continue
            lowerBound = userInfo["materials"][material]["Bounds"]["lower"][0]
            upperBound = userInfo["materials"][material]["Bounds"]["upper"][0]

            #SCM
            #if it has  an upper bounds then make sure to in clude it
            if(userInfo["materials"][material]["Type"] == "SCM"):
                if(upperBound < 0):
                    bounds.append((0.091, None))
                else:
                    bounds.append((0 ,upperBound))
            if(userInfo["materials"][material]["Type"] == "FA"):
                bounds.append((1, None))
            

            initial_guess.append(bounds[i][0])
            i+=1

        return bounds
        #return [(0, 0.2), (1, None), (0, None)]

    result_economical = minimize(rmse_function, initial_guess, bounds=get_bounds_economical(), method='L-BFGS-B')
    optimal_weights_economical = result_economical.x
    Economical = rmse_function.cumulative

    # Calculate RMSE values
    def calculate_rmse(true_values, predicted_values):
        return np.sqrt(np.mean((true_values - predicted_values)**2))

    # RMSE calculations
    rmse_no_boundaries = calculate_rmse(alpha, No_Boundaries)
    rmse_balanced = calculate_rmse(alpha, Balanced)
    rmse_economical = calculate_rmse(alpha, Economical)

    print("reached")
    # Print RMSE values and optimal weights

    scenarios = {
        "No Boundaries": (optimal_weights_no_boundaries, rmse_no_boundaries),
        "Balanced": (optimal_weights_balanced, rmse_balanced),
        "Economical": (optimal_weights_economical, rmse_economical)
    }
    data = {"message": ""}
    data["message"] += "    Optimal weights for each scenario:\n"

    for scenario, (weights, rmse) in scenarios.items():
        data["message"] += f"    Optimal weights for {scenario}:\n"
        data["message"] += f"    Weight_OPC = {Weight_OPC:.3f}\n"
        
        # Dynamically loop through materials and weights
        filtered_keys = [key for key in fileVolumes.keys() if key != "Cement"]
        for material, weight in zip(filtered_keys, weights):
            if(userInfo["materials"][material]["Type"] == "OPC"):
                continue
            data["message"] += f"    {material} = {weight:.3f}\n"
        
        # Append the RMSE for the current scenario
        data["message"] += f"    <span>RMSE for {scenario}: {rmse:.3f}</span>\n\n"
    data['rmse'] = rmseString
    # Exclude the first entry for each dataset
    d_plot = d  # Exclude the first element from x-axis values
    alpha_plot = alpha  # Exclude the first element from alpha values
    No_Boundaries_plot = No_Boundaries  # Exclude the first element from No Boundaries values
    Balanced_plot = Balanced  # Exclude the first element from Balanced values
    Economical_plot = Economical  # Exclude the first element from Economical values


    # Plotting the results
    plt.figure(figsize=(8, 6))
    plt.plot(d_plot, alpha_plot, label=f'Optimal (RMSE = {calculate_rmse(alpha, alpha_plot):.3f})', color='red')
    plt.plot(d_plot, No_Boundaries_plot, label=f'No Boundaries (RMSE = {rmse_no_boundaries:.3f})', color='grey', linestyle='--')
    plt.plot(d_plot, Balanced_plot, label=f'Balanced (RMSE = {rmse_balanced:.3f})', color='green', linestyle='--')
    plt.plot(d_plot, Economical_plot, label=f'Economical (RMSE = {rmse_economical:.3f})', color='blue', linestyle='--')
    plt.xscale('log')  # Set x-axis to logarithmic scale
    plt.xlabel('Particle Diameter (μm)')
    plt.ylabel('Passing Percentage (%)')
    plt.title('PSD Optimization')
    plt.legend()
    plt.xlim(left=d_plot.min(), right=500)
    formatter = FuncFormatter(lambda x, _: f'{x:.0f}')
    plt.gca().xaxis.set_major_formatter(formatter)
    plt.xticks([d_plot.min(), 10, 100, 500])
    plt.grid(True, which="both", ls="--")  # Show grid for both major and minor ticks

    img = io.BytesIO()
    plt.savefig(img, format='png', dpi=300)
    img.seek(0)
    plt.close()

    return {'img' : img, 'graphData' : data['message'], 'rmseData' : data['rmse']}